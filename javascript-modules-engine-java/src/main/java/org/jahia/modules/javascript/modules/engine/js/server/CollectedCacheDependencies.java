package org.jahia.modules.javascript.modules.engine.js.server;

import java.util.Arrays;
import java.util.Collection;
import java.util.Set;
import java.util.regex.Pattern;

import org.apache.commons.lang3.StringUtils;
import org.jahia.services.render.Resource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Registers the cache dependencies a view autocollected collected while it
 * rendered, so that its fragment is flushed when a node it linked to or
 * displayed changes.
 */
public final class CollectedCacheDependencies {

    private static final Logger logger = LoggerFactory.getLogger(CollectedCacheDependencies.class);

    /**
     * Cache entries a fragment may write for what it collected, before its paths
     * are merged.
     */
    public static final int DEFAULT_LIMIT = 100;

    private CollectedCacheDependencies() {
        // static helper
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
     *
     * @param dependencies the paths the fragment resolved
     * @param limit        the number of entries a fragment may write
     * @return the paths and regexps to register
     */
    static Reduced reduce(Collection<String> dependencies, int limit) {
        if (dependencies.size() <= limit) {
            return new Reduced(dependencies, Set.of());
        }

        return new Reduced(Set.of(), Set.of(commonRootRegex(dependencies)));
    }

    /**
     * A regexp matching everything under the deepest path every dependency lives
     * under, or under the repository root when they share no first segment.
     */
    private static String commonRootRegex(Collection<String> paths) {
        String[] common = null;
        for (String path : paths) {
            String[] segments = StringUtils.split(path, '/');
            if (common == null) {
                common = segments;
                continue;
            }
            int shared = 0;
            while (shared < common.length && shared < segments.length
                    && common[shared].equals(segments[shared])) {
                shared++;
            }
            if (shared == 0) {
                return "/.*";
            }
            if (shared < common.length) {
                common = Arrays.copyOf(common, shared);
            }
        }

        if (common == null || common.length == 0) {
            return "/.*";
        }

        return "/" + Pattern.quote(String.join("/", common)) + "/.*";
    }
}
