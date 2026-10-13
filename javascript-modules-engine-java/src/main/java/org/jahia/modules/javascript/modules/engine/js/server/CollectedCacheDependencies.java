package org.jahia.modules.javascript.modules.engine.js.server;

import java.util.Arrays;
import java.util.Collection;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

import javax.servlet.ServletRequest;

import org.apache.commons.lang3.StringUtils;
import org.jahia.services.render.RenderContext;
import org.jahia.services.render.Resource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Collects the cache dependencies a view resolves while it renders, and
 * registers them on its resource, so that its fragment is flushed when a node
 * it linked to or displayed changes.
 * <p>
 * {@link CollectedCacheDependenciesFilter} puts a {@link Collector} for each
 * cached fragment in a request attribute, with
 * {@code RenderChain.pushAttribute}. A nested fragment puts its own, and the
 * render chain restores the one of the parent when the nested render ends.
 */
public final class CollectedCacheDependencies {

    private static final Logger logger = LoggerFactory.getLogger(CollectedCacheDependencies.class);

    /**
     * Cache entries a fragment may write for what it collected, before its paths
     * are merged.
     */
    public static final int DEFAULT_LIMIT = 100;

    /** The request attribute that holds the {@link Collector} of the rendered fragment. */
    static final String ATTRIBUTE = CollectedCacheDependencies.class.getName();

    /**
     * The depth a merge never goes above: two segments, such as
     * {@code /sites/mysite}.
     */
    static final int MIN_MERGE_DEPTH = 2;

    private CollectedCacheDependencies() {
        // static helper
    }

    /** The paths collected for one cached fragment. */
    static final class Collector {
        final Resource resource;
        /** False when the view sets the opt-out property. */
        final boolean enabled;
        final Set<String> paths = new LinkedHashSet<>();

        Collector(Resource resource, boolean enabled) {
            this.resource = resource;
            this.enabled = enabled;
        }
    }

    /**
     * Collects a path for the fragment being rendered.
     *
     * @param renderContext the current rendering context
     * @param path          the canonical path of the node the view depends on
     */
    public static void collect(RenderContext renderContext, String path) {
        collect(renderContext.getRequest(), path);
    }

    static void collect(ServletRequest request, String path) {
        Object collector = request.getAttribute(ATTRIBUTE);
        if (collector instanceof Collector && ((Collector) collector).enabled && StringUtils.isNotEmpty(path)) {
            ((Collector) collector).paths.add(path);
        }
    }

    /**
     * Returns the paths collected for a resource.
     *
     * @param request  the current request
     * @param resource the rendered resource
     * @return the collected paths, empty when none
     */
    static Set<String> collected(ServletRequest request, Resource resource) {
        Object collector = request.getAttribute(ATTRIBUTE);
        // Resource overrides equals(): two renders of one node are two fragments
        if (collector instanceof Collector && ((Collector) collector).resource == resource) {
            return ((Collector) collector).paths;
        }
        return Set.of();
    }

    /**
     * Reduces the collected paths and registers them on the resource, before the
     * render chain stores its fragment.
     */
    public static void register(Resource resource, Collection<String> paths, int limit) {
        if (paths.isEmpty()) {
            return;
        }

        Reduced reduced = reduce(paths, limit);
        resource.getDependencies().addAll(reduced.paths);
        resource.getRegexpDependencies().addAll(reduced.regexps);

        int entries = reduced.paths.size() + reduced.regexps.size();
        if (entries > limit) {
            logger.warn("{} autocollected {} node dependencies, and {} remain after the merge, more than the {} limit. "
                            + "No merge goes above /sites/<key>. Narrow what the view links to, or set "
                            + "cache.autocollectDependencies=false on it and declare the dependency it needs.",
                    resource, reduced.collected, entries, limit);
        } else if (!reduced.regexps.isEmpty()) {
            logger.info("{} autocollected {} node dependencies, more than the {} limit, so some were merged into {}. "
                            + "If incorrect, narrow what the view links to, or set "
                            + "cache.autocollectDependencies=false on it and declare the dependency it needs.",
                    resource, reduced.collected, limit, reduced.regexps);
        }
    }

    /** Registers the collected paths with the default limit (100). */
    public static void register(Resource resource, Collection<String> paths) {
        register(resource, paths, DEFAULT_LIMIT);
    }

    /** The dependencies to register, after reduction. */
    static final class Reduced {
        /** The number of collected paths the reduction kept. */
        final int collected;
        final Collection<String> paths;
        final Collection<String> regexps;

        private Reduced(int collected, Collection<String> paths, Collection<String> regexps) {
            this.collected = collected;
            this.paths = paths;
            this.regexps = regexps;
        }
    }

    /**
     * Reduces a fragment's collected dependencies to at most {@code limit} cache
     * entries, when a merge can reach that number.
     * <p>
     * The paths under {@code /modules} are dropped, because the core cache
     * filters store no dependency there. Above the limit, the deepest folder that
     * covers two entries or more becomes one regexp. The merge repeats until the
     * entries fit. A merge never covers a folder above {@value #MIN_MERGE_DEPTH}
     * segments, such as {@code /sites}, so the result can stay above the limit.
     *
     * @param dependencies the paths the fragment resolved
     * @param limit        the number of entries a fragment may write
     * @return the paths and regexps to register
     */
    static Reduced reduce(Collection<String> dependencies, int limit) {
        // the exact paths, each with its segments
        Map<String, String[]> exact = new LinkedHashMap<>();
        for (String path : dependencies) {
            if (!isUnderModules(path)) {
                exact.put(path, StringUtils.split(path, '/'));
            }
        }
        int collected = exact.size();
        if (collected <= limit) {
            return new Reduced(collected, exact.keySet(), Set.of());
        }

        // the merged folders, each with its segments
        Map<String, String[]> folders = new LinkedHashMap<>();
        while (exact.size() + folders.size() > limit) {
            String[] folder = deepestSharedFolder(exact.values(), folders.values());
            if (folder == null) {
                break;
            }
            removeUnder(exact, folder);
            removeUnder(folders, folder);
            folders.put(String.join("/", folder), folder);
        }

        Set<String> regexps = new LinkedHashSet<>();
        for (String folder : folders.keySet()) {
            regexps.add("/" + Pattern.quote(folder) + "(/.*)?");
        }
        return new Reduced(collected, new LinkedHashSet<>(exact.keySet()), regexps);
    }

    private static boolean isUnderModules(String path) {
        return "/modules".equals(path) || path.startsWith("/modules/");
    }

    /**
     * The deepest folder of at least {@value #MIN_MERGE_DEPTH} segments that
     * covers two entries or more, or null when no folder covers two. At one depth,
     * the folder that covers the most entries wins. An entry covers its own path,
     * because a regexp on a folder matches the folder too.
     */
    private static String[] deepestSharedFolder(Collection<String[]> exact, Collection<String[]> folders) {
        Map<String, Integer> covered = new HashMap<>();
        Map<String, String[]> segmentsOf = new HashMap<>();
        for (Collection<String[]> entries : List.of(exact, folders)) {
            for (String[] segments : entries) {
                for (int depth = MIN_MERGE_DEPTH; depth <= segments.length; depth++) {
                    String[] folder = Arrays.copyOf(segments, depth);
                    String key = String.join("/", folder);
                    covered.merge(key, 1, Integer::sum);
                    segmentsOf.putIfAbsent(key, folder);
                }
            }
        }

        String best = null;
        for (Map.Entry<String, Integer> entry : covered.entrySet()) {
            if (entry.getValue() >= 2 && (best == null
                    || isBetter(segmentsOf.get(entry.getKey()), entry.getValue(), segmentsOf.get(best), covered.get(best)))) {
                best = entry.getKey();
            }
        }
        return best == null ? null : segmentsOf.get(best);
    }

    /** Deeper first, then the folder that covers more entries, then the first in path order. */
    private static boolean isBetter(String[] candidate, int count, String[] best, int bestCount) {
        if (candidate.length != best.length) {
            return candidate.length > best.length;
        }
        if (count != bestCount) {
            return count > bestCount;
        }
        return String.join("/", candidate).compareTo(String.join("/", best)) < 0;
    }

    /** Removes the entries at or below a folder, comparing whole segments. */
    private static void removeUnder(Map<String, String[]> entries, String[] folder) {
        for (Iterator<String[]> it = entries.values().iterator(); it.hasNext();) {
            String[] segments = it.next();
            if (segments.length >= folder.length
                    && Arrays.equals(segments, 0, folder.length, folder, 0, folder.length)) {
                it.remove();
            }
        }
    }
}
