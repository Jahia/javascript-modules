package org.jahia.modules.javascript.modules.engine.js.server;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.HashSet;
import java.util.Set;

import org.junit.Test;

public class CollectedCacheDependenciesTest {

    private static Set<String> children(String parent, int count) {
        Set<String> paths = new HashSet<>();
        for (int i = 0; i < count; i++) {
            paths.add(parent + "/item-" + i);
        }
        return paths;
    }

    private static String mergedInto(Set<String> dependencies) {
        CollectedCacheDependencies.Reduced reduced = CollectedCacheDependencies.reduce(dependencies, 100);
        assertFalse("the dependencies were expected to be merged", reduced.regexps.isEmpty());
        assertTrue("a merged fragment keeps no exact dependency", reduced.paths.isEmpty());
        assertEquals(1, reduced.regexps.size());
        return reduced.regexps.iterator().next();
    }

    @Test
    public void shouldKeepEveryDependencyExactWithinBudget() {
        Set<String> dependencies = children("/sites/mysite/contents/posts", 100);

        CollectedCacheDependencies.Reduced reduced = CollectedCacheDependencies.reduce(dependencies, 100);

        assertEquals(dependencies, reduced.paths);
        assertTrue(reduced.regexps.isEmpty());
    }

    @Test
    public void shouldMergeAListingIntoTheFolderItLivesIn() {
        String regexp = mergedInto(children("/sites/mysite/contents/posts", 150));

        assertTrue("/sites/mysite/contents/posts/item-1".matches(regexp));
        // an edited title lands on a subnode of the item
        assertTrue("/sites/mysite/contents/posts/item-1/j:translation_en".matches(regexp));
        assertFalse("the merged folder itself is not covered",
                "/sites/mysite/contents/posts".matches(regexp));
        assertFalse("a sibling folder is not covered",
                "/sites/mysite/contents/events/item-1".matches(regexp));
    }

    @Test
    public void shouldMergeToTheDeepestSharedFolder() {
        Set<String> dependencies = children("/sites/mysite/contents/posts", 80);
        dependencies.addAll(children("/sites/mysite/contents/events", 80));

        String regexp = mergedInto(dependencies);

        assertTrue("/sites/mysite/contents/posts/item-1".matches(regexp));
        assertTrue("/sites/mysite/contents/events/item-1".matches(regexp));
        assertFalse("nothing above the shared folder is covered",
                "/sites/mysite/files/logo.png".matches(regexp));
    }

    @Test
    public void shouldCompareWholeSegmentsRatherThanCharacters() {
        Set<String> dependencies = children("/sites/mysite/contents", 80);
        dependencies.addAll(children("/sites/mysite2/contents", 80));

        String regexp = mergedInto(dependencies);

        // /sites/mysite is a character prefix of /sites/mysite2, but not an ancestor of
        // it
        assertTrue("/sites/mysite2/contents/item-1".matches(regexp));
        assertTrue("/sites/mysite/contents/item-1".matches(regexp));
    }

    @Test
    public void shouldMergeToTheRepositoryRootWhenNothingIsShared() {
        Set<String> dependencies = children("/sites/mysite/contents", 80);
        dependencies.addAll(children("/users/root/files", 80));

        String regexp = mergedInto(dependencies);

        assertTrue("/sites/mysite/contents/item-1".matches(regexp));
        assertTrue("/users/root/files/item-1".matches(regexp));
        assertTrue("a fragment merged to the root is flushed by anything",
                "/sites/other/contents/whatever".matches(regexp));
    }

    @Test
    public void shouldLetOneStrayDependencyWidenTheMerge() {
        Set<String> dependencies = children("/sites/mysite/contents/posts", 150);
        dependencies.add("/modules/mymodule/templates/one");

        String regexp = mergedInto(dependencies);

        // The stray path shares no first segment with the listing, so the merge reaches
        // the root
        assertTrue("/sites/other/contents/whatever".matches(regexp));
    }

    @Test
    public void shouldQuoteThePathSoADotIsNotAWildcard() {
        String regexp = mergedInto(children("/sites/mysite/files/my.docs", 150));

        assertTrue("/sites/mysite/files/my.docs/item-1".matches(regexp));
        assertFalse("/sites/mysite/files/myXdocs/item-1".matches(regexp));
    }
}
