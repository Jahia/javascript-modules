package org.jahia.modules.javascript.modules.engine.js.server;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.jahia.services.render.Resource;
import org.junit.Test;

/**
 * The invariants of {@link CollectedCacheDependencies#reduce} on generated
 * input, and its edge cases.
 */
public class CollectedCacheDependenciesReduceTest {

    private static final Pattern FOLDER_OF_REGEXP = Pattern.compile("/\\\\Q(.*)\\\\E\\(/\\.\\*\\)\\?");

    private static final long SEED = 20261013L;
    private static final int CASES = 500;
    private static final int[] LIMITS = {1, 2, 5, 20, 100};

    private static String regexp(String folder) {
        return "/\\Q" + folder.substring(1) + "\\E(/.*)?";
    }

    /** The folder a regexp of the reduction covers, without its leading slash. */
    private static String folderOf(String regexp) {
        Matcher matcher = FOLDER_OF_REGEXP.matcher(regexp);
        assertTrue("not a regexp of the reduction: " + regexp, matcher.matches());
        return matcher.group(1);
    }

    private static boolean isUnderModules(String path) {
        return "/modules".equals(path) || path.startsWith("/modules/");
    }

    private static boolean isAtOrBelow(String path, String folder) {
        String relative = path.startsWith("/") ? path.substring(1) : path;
        return relative.equals(folder) || relative.startsWith(folder + "/");
    }

    /** Paths over a few sites, user folders and modules, where siblings share names and character prefixes. */
    private static List<String> generate(Random random) {
        String[] roots = {"/sites/s0", "/sites/s1", "/sites/s10", "/users/ab/cd", "/modules/m"};
        String[] names = {"n0", "n1", "n10", "a.b", "aXb"};
        List<String> paths = new ArrayList<>();
        int count = 1 + random.nextInt(400);
        for (int i = 0; i < count; i++) {
            StringBuilder path = new StringBuilder(roots[random.nextInt(roots.length)]);
            int depth = random.nextInt(5);
            for (int d = 0; d < depth; d++) {
                path.append('/').append(names[random.nextInt(names.length)]).append(random.nextInt(4));
            }
            paths.add(path.toString());
        }
        if (random.nextInt(10) == 0) {
            paths.add("/sites");
        }
        if (random.nextInt(10) == 0) {
            paths.add("/");
        }
        return paths;
    }

    @Test
    public void shouldHoldItsInvariantsOnGeneratedInput() {
        Random random = new Random(SEED);
        for (int c = 0; c < CASES; c++) {
            List<String> input = generate(random);
            int limit = LIMITS[random.nextInt(LIMITS.length)];
            String context = "case " + c + " (seed " + SEED + "), limit " + limit + ", input " + input;

            CollectedCacheDependencies.Reduced reduced = CollectedCacheDependencies.reduce(input, limit);
            Set<String> kept = new LinkedHashSet<>();
            for (String path : input) {
                if (!isUnderModules(path)) {
                    kept.add(path);
                }
            }
            List<String> folders = new ArrayList<>();
            for (String regexp : reduced.regexps) {
                folders.add(folderOf(regexp));
            }

            assertEquals(context, kept.size(), reduced.collected);
            assertTrue("an exact path that was not collected: " + context, kept.containsAll(reduced.paths));

            // nothing is lost: each kept path is exact or covered by a regexp
            for (String path : kept) {
                boolean covered = reduced.paths.contains(path)
                        || reduced.regexps.stream().anyMatch(path::matches);
                assertTrue("lost " + path + ": " + context, covered);
            }

            // nothing is merged within the limit
            if (kept.size() <= limit) {
                assertEquals(context, kept, new HashSet<>(reduced.paths));
                assertTrue(context, reduced.regexps.isEmpty());
                continue;
            }

            for (String folder : folders) {
                // the floor: never above /sites/<key>
                assertTrue("merged above the floor: " + folder + ": " + context,
                        folder.split("/").length >= CollectedCacheDependencies.MIN_MERGE_DEPTH);
                assertFalse("merged a module folder: " + context, folder.startsWith("modules"));
                // precision: a merged folder holds two collected paths or more
                long holds = kept.stream().filter(path -> isAtOrBelow(path, folder)).count();
                assertTrue("merged " + folder + " for " + holds + " path: " + context, holds >= 2);
                // no redundancy: no entry lies inside a merged folder
                for (String path : reduced.paths) {
                    assertFalse(path + " lies in " + folder + ": " + context, isAtOrBelow(path, folder));
                }
                for (String other : folders) {
                    assertTrue(other + " lies in " + folder + ": " + context,
                            other.equals(folder) || !isAtOrBelow(other, folder));
                }
            }

            // the bound: above the limit, no folder of two segments or more holds two entries
            int entries = reduced.paths.size() + reduced.regexps.size();
            if (entries > limit) {
                Map<String, Integer> covered = new HashMap<>();
                Collection<String> all = new ArrayList<>(reduced.paths);
                folders.forEach(folder -> all.add("/" + folder));
                for (String entry : all) {
                    String[] segments = entry.substring(1).split("/");
                    for (int depth = CollectedCacheDependencies.MIN_MERGE_DEPTH; depth <= segments.length; depth++) {
                        covered.merge(String.join("/", Arrays.copyOf(segments, depth)), 1, Integer::sum);
                    }
                }
                covered.forEach((folder, count) -> {
                    if (count >= 2) {
                        fail(folder + " could still merge " + count + " entries: " + context);
                    }
                });
            }

            // the result does not depend on the order of the input
            List<String> shuffled = new ArrayList<>(input);
            java.util.Collections.shuffle(shuffled, new Random(c));
            CollectedCacheDependencies.Reduced again = CollectedCacheDependencies.reduce(shuffled, limit);
            assertEquals(context, new HashSet<>(reduced.paths), new HashSet<>(again.paths));
            assertEquals(context, new HashSet<>(reduced.regexps), new HashSet<>(again.regexps));
        }
    }

    @Test
    public void shouldNotMergeAtTheLimit() {
        Set<String> paths = new HashSet<>();
        for (int i = 0; i < 100; i++) {
            paths.add("/sites/mysite/home/item-" + i);
        }

        assertTrue(CollectedCacheDependencies.reduce(paths, 100).regexps.isEmpty());

        paths.add("/sites/mysite/home/item-100");
        assertEquals(Set.of(regexp("/sites/mysite/home")), CollectedCacheDependencies.reduce(paths, 100).regexps);
    }

    @Test
    public void shouldAbsorbADeeperMergeIntoAHigherOne() {
        List<String> paths = List.of("/sites/a/x/p1", "/sites/a/x/p2", "/sites/a/x/p3", "/sites/a/y/q1",
                "/sites/a/z/r1");

        CollectedCacheDependencies.Reduced toThree = CollectedCacheDependencies.reduce(paths, 3);
        assertEquals(Set.of(regexp("/sites/a/x")), toThree.regexps);
        assertEquals(Set.of("/sites/a/y/q1", "/sites/a/z/r1"), new HashSet<>(toThree.paths));

        // x merges first, then the site folder takes x, y and z
        CollectedCacheDependencies.Reduced toOne = CollectedCacheDependencies.reduce(paths, 1);
        assertEquals(Set.of(regexp("/sites/a")), toOne.regexps);
        assertTrue(toOne.paths.isEmpty());
    }

    @Test
    public void shouldDropTheExactFolderItMerges() {
        Set<String> paths = new HashSet<>();
        paths.add("/sites/mysite/contents/posts");
        for (int i = 0; i < 150; i++) {
            paths.add("/sites/mysite/contents/posts/item-" + i);
        }

        CollectedCacheDependencies.Reduced reduced = CollectedCacheDependencies.reduce(paths, 100);

        assertTrue(reduced.paths.isEmpty());
        assertEquals(Set.of(regexp("/sites/mysite/contents/posts")), reduced.regexps);
    }

    @Test
    public void shouldKeepPathsAboveTheFloorExact() {
        List<String> paths = List.of("/", "/sites", "/sites/a", "/sites/b");

        CollectedCacheDependencies.Reduced reduced = CollectedCacheDependencies.reduce(paths, 1);

        assertEquals(new HashSet<>(paths), new HashSet<>(reduced.paths));
        assertTrue(reduced.regexps.isEmpty());
    }

    @Test
    public void shouldRegisterExactPathsWithinTheLimit() {
        Resource resource = new Resource("/sites/mysite/home", "/sites/mysite/home", null, "html", "default", "module");

        CollectedCacheDependencies.register(resource, List.of("/sites/mysite/files/logo.png", "/modules/m/x"));

        assertEquals(Set.of("/sites/mysite/home", "/sites/mysite/files/logo.png"), resource.getDependencies());
        assertTrue(resource.getRegexpDependencies().isEmpty());
    }

    @Test
    public void shouldRegisterTheMergedFolders() {
        Resource resource = new Resource("/sites/mysite/home", "/sites/mysite/home", null, "html", "default", "module");
        List<String> paths = new ArrayList<>();
        for (int i = 0; i < 150; i++) {
            paths.add("/sites/mysite/contents/posts/item-" + i);
        }
        paths.add("/sites/mysite/files/logo.png");

        CollectedCacheDependencies.register(resource, paths);

        assertEquals(Set.of("/sites/mysite/home", "/sites/mysite/files/logo.png"), resource.getDependencies());
        assertEquals(Set.of(regexp("/sites/mysite/contents/posts")), resource.getRegexpDependencies());
    }

    @Test
    public void shouldRegisterEveryPathWhenTheLimitCannotBeReached() {
        Resource resource = new Resource("/sites/portal/home", "/sites/portal/home", null, "html", "default", "module");
        List<String> paths = new ArrayList<>();
        for (int i = 0; i < 150; i++) {
            paths.add("/sites/site-" + i + "/home");
        }

        CollectedCacheDependencies.register(resource, paths);

        assertEquals(151, resource.getDependencies().size());
        assertTrue(resource.getRegexpDependencies().isEmpty());
    }

    /** The worst case for a merge: many folders of two paths, so each merge removes one entry. */
    @Test(timeout = 5000)
    public void shouldReduceManySmallFoldersQuickly() {
        List<String> paths = new ArrayList<>();
        for (int i = 0; i < 2500; i++) {
            paths.add("/sites/mysite/folder-" + i + "/a");
            paths.add("/sites/mysite/folder-" + i + "/b");
        }

        CollectedCacheDependencies.Reduced reduced = CollectedCacheDependencies.reduce(paths, 100);

        assertEquals(Set.of(regexp("/sites/mysite")), reduced.regexps);
        assertTrue(reduced.paths.isEmpty());
    }
}
