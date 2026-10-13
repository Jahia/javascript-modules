package org.jahia.modules.javascript.modules.engine.js.server;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.IdentityHashMap;
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
 * The paths are kept per resource in a request attribute, because a view
 * renders other resources inside its own render. The core
 * {@code BaseAttributesFilter} keeps the {@code currentResource} request
 * attribute on the resource being rendered.
 */
public final class CollectedCacheDependencies {

    private static final Logger logger = LoggerFactory.getLogger(CollectedCacheDependencies.class);

    /**
     * Cache entries a fragment may write for what it collected, before its paths
     * are merged.
     */
    public static final int DEFAULT_LIMIT = 100;

    /** The request attribute that holds the collected paths of each resource. */
    static final String ATTRIBUTE = CollectedCacheDependencies.class.getName();

    /** The request attribute in which the core render chain keeps the rendered resource. */
    static final String CURRENT_RESOURCE = "currentResource";

    /**
     * The depth a merge never goes above: two segments, such as
     * {@code /sites/mysite}.
     */
    static final int MIN_MERGE_DEPTH = 2;

    private CollectedCacheDependencies() {
        // static helper
    }

    /**
     * Collects a path for the resource being rendered.
     *
     * @param request the current request
     * @param path    the canonical path of the node the view depends on
     */
    public static void collect(ServletRequest request, String path) {
        Object resource = request.getAttribute(CURRENT_RESOURCE);
        if (!(resource instanceof Resource) || StringUtils.isEmpty(path)) {
            return;
        }

        @SuppressWarnings("unchecked")
        Map<Resource, Set<String>> byResource = (Map<Resource, Set<String>>) request.getAttribute(ATTRIBUTE);
        if (byResource == null) {
            // Resource overrides equals(): two renders of one node are two fragments
            byResource = new IdentityHashMap<>();
            request.setAttribute(ATTRIBUTE, byResource);
        }
        byResource.computeIfAbsent((Resource) resource, r -> new LinkedHashSet<>()).add(path);
    }

    /**
     * Removes and returns the paths collected for a resource.
     *
     * @param request  the current request
     * @param resource the rendered resource
     * @return the collected paths, empty when none
     */
    public static Set<String> take(ServletRequest request, Resource resource) {
        @SuppressWarnings("unchecked")
        Map<Resource, Set<String>> byResource = (Map<Resource, Set<String>>) request.getAttribute(ATTRIBUTE);
        if (byResource == null) {
            return Set.of();
        }
        Set<String> paths = byResource.remove(resource);
        return paths == null ? Set.of() : paths;
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

        if (!reduced.regexps.isEmpty()) {
            logger.info(
                    "{} autocollected {} node dependencies, more than the {} limit, so they were merged into {}. "
                            + "If incorrect, narrow what the view lists, or set cache.autocollectDependencies=false on it and declare the dependency it needs.",
                    resource, paths.size(), limit, reduced.regexps);
        }
    }

    /** Registers the collected paths with the default limit (100). */
    public static void register(Resource resource, Collection<String> paths) {
        register(resource, paths, DEFAULT_LIMIT);
    }

    /** The dependencies to register, after reduction. */
    static final class Reduced {
        final Collection<String> paths;
        final Collection<String> regexps;

        private Reduced(Collection<String> paths, Collection<String> regexps) {
            this.paths = paths;
            this.regexps = regexps;
        }
    }

    /**
     * Reduces a fragment's collected dependencies to at most {@code limit} cache
     * entries.
     * <p>
     * The paths under {@code /modules} are dropped, because the core cache
     * filters store no dependency there. Above the limit, the paths are grouped
     * by their first {@value #MIN_MERGE_DEPTH} segments, and each group with more
     * than one path becomes one regexp on its deepest common folder. A merge
     * therefore never covers more than one site.
     *
     * @param dependencies the paths the fragment resolved
     * @param limit        the number of entries a fragment may write
     * @return the paths and regexps to register
     */
    static Reduced reduce(Collection<String> dependencies, int limit) {
        Set<String> kept = new LinkedHashSet<>();
        for (String path : dependencies) {
            if (!isUnderModules(path)) {
                kept.add(path);
            }
        }

        if (kept.size() <= limit) {
            return new Reduced(kept, Set.of());
        }

        Map<String, List<String[]>> groups = new LinkedHashMap<>();
        for (String path : kept) {
            String[] segments = StringUtils.split(path, '/');
            String scope = String.join("/", Arrays.copyOf(segments, Math.min(segments.length, MIN_MERGE_DEPTH)));
            groups.computeIfAbsent(scope, s -> new ArrayList<>()).add(segments);
        }

        Set<String> paths = new LinkedHashSet<>();
        Set<String> regexps = new LinkedHashSet<>();
        for (List<String[]> group : groups.values()) {
            if (group.size() == 1) {
                paths.add("/" + String.join("/", group.get(0)));
            } else {
                regexps.add(commonRootRegex(group));
            }
        }
        return new Reduced(paths, regexps);
    }

    private static boolean isUnderModules(String path) {
        return "/modules".equals(path) || path.startsWith("/modules/");
    }

    /**
     * A regexp matching the deepest folder every path of the group lives under,
     * and everything below it. The paths of a group share their first
     * {@value #MIN_MERGE_DEPTH} segments, or are that folder itself.
     */
    private static String commonRootRegex(List<String[]> group) {
        String[] common = group.get(0);
        for (String[] segments : group) {
            int shared = 0;
            while (shared < common.length && shared < segments.length
                    && common[shared].equals(segments[shared])) {
                shared++;
            }
            if (shared < common.length) {
                common = Arrays.copyOf(common, shared);
            }
        }

        return "/" + Pattern.quote(String.join("/", common)) + "(/.*)?";
    }
}
