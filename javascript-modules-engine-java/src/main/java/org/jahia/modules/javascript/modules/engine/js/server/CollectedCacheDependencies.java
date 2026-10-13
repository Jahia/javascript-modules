package org.jahia.modules.javascript.modules.engine.js.server;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

import javax.servlet.ServletRequest;

import org.apache.commons.lang3.StringUtils;
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
     * @param request the current request
     * @param path    the canonical path of the node the view depends on
     */
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
     * covers two entries or more becomes one regexp, the biggest first at one
     * depth. The merge goes up one depth at a time until the entries fit. A merge
     * never covers a folder above {@value #MIN_MERGE_DEPTH} segments, such as
     * {@code /sites}, so the result can stay above the limit.
     *
     * @param dependencies the paths the fragment resolved
     * @param limit        the number of entries a fragment may write
     * @return the paths and regexps to register
     */
    static Reduced reduce(Collection<String> dependencies, int limit) {
        // the exact paths and the merged folders, each with its segments
        Map<String, String[]> exact = new LinkedHashMap<>();
        Map<String, String[]> folders = new LinkedHashMap<>();
        int deepest = 0;
        for (String path : dependencies) {
            if (!isUnderModules(path)) {
                String[] segments = StringUtils.split(path, '/');
                exact.put(path, segments);
                deepest = Math.max(deepest, segments.length);
            }
        }
        int collected = exact.size();

        // Two folders at one depth never overlap, so a merge at one depth leaves the
        // other folders of that depth as they were
        for (int depth = deepest; depth >= MIN_MERGE_DEPTH && exact.size() + folders.size() > limit; depth--) {
            Map<String, Folder> atDepth = new HashMap<>();
            group(exact, depth, atDepth, true);
            group(folders, depth, atDepth, false);

            List<Folder> candidates = new ArrayList<>();
            for (Folder folder : atDepth.values()) {
                if (folder.size() >= 2) {
                    candidates.add(folder);
                }
            }
            candidates.sort(Comparator.comparingInt(Folder::size).reversed().thenComparing(folder -> folder.key));

            for (Folder folder : candidates) {
                if (exact.size() + folders.size() <= limit) {
                    break;
                }
                folder.exact.forEach(exact::remove);
                folder.folders.forEach(folders::remove);
                folders.put(folder.key, folder.segments);
            }
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

    /** The entries at or below one folder. An entry covers its own path, because a regexp on a folder matches it. */
    private static final class Folder {
        final String key;
        final String[] segments;
        final List<String> exact = new ArrayList<>();
        final List<String> folders = new ArrayList<>();

        Folder(String key, String[] segments) {
            this.key = key;
            this.segments = segments;
        }

        int size() {
            return exact.size() + folders.size();
        }
    }

    /** Groups the entries deep enough by their folder at one depth. */
    private static void group(Map<String, String[]> entries, int depth, Map<String, Folder> atDepth, boolean exact) {
        for (Map.Entry<String, String[]> entry : entries.entrySet()) {
            String[] segments = entry.getValue();
            if (segments.length < depth) {
                continue;
            }
            String[] folderSegments = Arrays.copyOf(segments, depth);
            Folder folder = atDepth.computeIfAbsent(String.join("/", folderSegments),
                    key -> new Folder(key, folderSegments));
            (exact ? folder.exact : folder.folders).add(entry.getKey());
        }
    }
}
