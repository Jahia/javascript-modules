package org.jahia.modules.javascript.modules.engine.js.server;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.lang.reflect.Proxy;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Predicate;

import javax.servlet.http.HttpServletRequest;

import org.jahia.services.render.Resource;
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

    private static Resource resource(String path) {
        return new Resource(path, path, null, "html", "default", "module");
    }

    /** A request that only keeps its attributes. */
    private static HttpServletRequest request() {
        Map<Object, Object> attributes = new HashMap<>();
        return (HttpServletRequest) Proxy.newProxyInstance(HttpServletRequest.class.getClassLoader(),
                new Class<?>[] {HttpServletRequest.class}, (proxy, method, args) -> {
                    switch (method.getName()) {
                        case "getAttribute":
                            return attributes.get(args[0]);
                        case "setAttribute":
                            attributes.put(args[0], args[1]);
                            return null;
                        default:
                            throw new UnsupportedOperationException(method.getName());
                    }
                });
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
        // the folder may itself be one of the linked nodes: renaming it must flush the
        // fragment
        assertTrue("the merged folder itself is covered",
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
    public void shouldNeverMergeAboveTheSite() {
        Set<String> dependencies = children("/sites/mysite/home", 80);
        dependencies.addAll(children("/sites/mysite/files", 80));

        String regexp = mergedInto(dependencies);

        assertTrue("/sites/mysite/home/item-1".matches(regexp));
        assertTrue("/sites/mysite/files/item-1".matches(regexp));
        assertFalse("another site is not covered", "/sites/other/home/item-1".matches(regexp));
    }

    @Test
    public void shouldMergeEachSiteSeparately() {
        Set<String> dependencies = children("/sites/mysite/contents", 80);
        dependencies.addAll(children("/sites/mysite2/contents", 80));

        CollectedCacheDependencies.Reduced reduced = CollectedCacheDependencies.reduce(dependencies, 100);

        // /sites/mysite is a character prefix of /sites/mysite2, but not an ancestor of
        // it
        assertTrue(reduced.paths.isEmpty());
        assertEquals(Set.of("/\\Qsites/mysite/contents\\E(/.*)?", "/\\Qsites/mysite2/contents\\E(/.*)?"),
                new HashSet<>(reduced.regexps));
    }

    @Test
    public void shouldNeverMergeToTheRepositoryRoot() {
        Set<String> dependencies = children("/sites/mysite/contents", 80);
        dependencies.addAll(children("/users/root/files", 80));

        CollectedCacheDependencies.Reduced reduced = CollectedCacheDependencies.reduce(dependencies, 100);

        assertEquals(2, reduced.regexps.size());
        for (String regexp : reduced.regexps) {
            assertFalse(regexp + " covers another site", "/sites/other/contents/whatever".matches(regexp));
        }
    }

    @Test
    public void shouldKeepALoneDependencyOfAnotherSiteExact() {
        Set<String> dependencies = children("/sites/mysite/contents/posts", 150);
        dependencies.add("/sites/shared/files/logo.png");

        CollectedCacheDependencies.Reduced reduced = CollectedCacheDependencies.reduce(dependencies, 100);

        assertEquals(Set.of("/sites/shared/files/logo.png"), new HashSet<>(reduced.paths));
        assertEquals(Set.of("/\\Qsites/mysite/contents/posts\\E(/.*)?"), new HashSet<>(reduced.regexps));
    }

    @Test
    public void shouldDropModuleDependenciesAsTheCoreCacheDoes() {
        Set<String> dependencies = children("/sites/mysite/contents/posts", 150);
        dependencies.add("/modules/mymodule/templates/one");

        String regexp = mergedInto(dependencies);

        assertFalse("/sites/other/contents/whatever".matches(regexp));
        assertTrue(CollectedCacheDependencies.reduce(Set.of("/modules/mymodule/templates/one"), 100).paths.isEmpty());
    }

    @Test
    public void shouldQuoteThePathSoADotIsNotAWildcard() {
        String regexp = mergedInto(children("/sites/mysite/files/my.docs", 150));

        assertTrue("/sites/mysite/files/my.docs/item-1".matches(regexp));
        assertFalse("/sites/mysite/files/myXdocs/item-1".matches(regexp));
    }

    private static final Predicate<Resource> ENABLED = resource -> true;

    /** Starts the render of a resource, as the filter does in prepare. */
    private static void startRender(HttpServletRequest request, Resource resource) {
        request.setAttribute(CollectedCacheDependencies.ATTRIBUTE, new CollectedCacheDependencies.Collector(resource));
    }

    @Test
    public void shouldCollectForTheResourceBeingRendered() {
        HttpServletRequest request = request();
        Resource parent = resource("/sites/mysite/home");
        Resource child = resource("/sites/mysite/home/area/child");

        startRender(request, parent);
        CollectedCacheDependencies.collect(request, "/sites/mysite/home/about", ENABLED);
        // a nested render: the render chain pushes the child's collector, then restores the parent's
        Object parentCollector = request.getAttribute(CollectedCacheDependencies.ATTRIBUTE);
        startRender(request, child);
        CollectedCacheDependencies.collect(request, "/sites/mysite/files/logo.png", ENABLED);
        assertEquals(Set.of("/sites/mysite/files/logo.png"), CollectedCacheDependencies.collected(request, child));
        request.setAttribute(CollectedCacheDependencies.ATTRIBUTE, parentCollector);
        CollectedCacheDependencies.collect(request, "/sites/mysite/home/contact", ENABLED);

        assertEquals(Set.of("/sites/mysite/home/about", "/sites/mysite/home/contact"),
                CollectedCacheDependencies.collected(request, parent));
    }

    @Test
    public void shouldTellTwoRendersOfOneNodeApart() {
        HttpServletRequest request = request();
        Resource first = resource("/sites/mysite/home/teaser");
        Resource second = resource("/sites/mysite/home/teaser");

        startRender(request, first);
        CollectedCacheDependencies.collect(request, "/sites/mysite/home/about", ENABLED);

        assertTrue(CollectedCacheDependencies.collected(request, second).isEmpty());
        assertEquals(Set.of("/sites/mysite/home/about"), CollectedCacheDependencies.collected(request, first));
    }

    @Test
    public void shouldCollectNothingOutsideARender() {
        HttpServletRequest request = request();

        CollectedCacheDependencies.collect(request, "/sites/mysite/home/about", ENABLED);

        assertTrue(CollectedCacheDependencies.collected(request, resource("/sites/mysite/home")).isEmpty());
    }

    @Test
    public void shouldCollectNothingForAViewThatOptedOutAndReadItsViewOnce() {
        HttpServletRequest request = request();
        Resource resource = resource("/sites/mysite/home");
        AtomicInteger reads = new AtomicInteger();

        startRender(request, resource);
        for (int i = 0; i < 3; i++) {
            CollectedCacheDependencies.collect(request, "/sites/mysite/home/item-" + i, r -> {
                reads.incrementAndGet();
                return false;
            });
        }

        assertTrue(CollectedCacheDependencies.collected(request, resource).isEmpty());
        assertEquals(1, reads.get());
    }
}
