package org.jahia.modules.javascript.modules.engine.js.server;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.lang.reflect.Proxy;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

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

    private static String regexp(String folder) {
        return "/\\Q" + folder.substring(1) + "\\E(/.*)?";
    }

    private static CollectedCacheDependencies.Reduced reduce(Set<String> dependencies) {
        return CollectedCacheDependencies.reduce(dependencies, 100);
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

    /** Starts the render of a cached fragment, as the filter does in prepare. */
    private static void startRender(HttpServletRequest request, Resource resource, boolean enabled) {
        request.setAttribute(CollectedCacheDependencies.ATTRIBUTE,
                new CollectedCacheDependencies.Collector(resource, enabled));
    }

    @Test
    public void shouldKeepEveryDependencyExactWithinBudget() {
        Set<String> dependencies = children("/sites/mysite/contents/posts", 100);

        CollectedCacheDependencies.Reduced reduced = reduce(dependencies);

        assertEquals(dependencies, reduced.paths);
        assertTrue(reduced.regexps.isEmpty());
    }

    @Test
    public void shouldMergeAListingIntoTheFolderItLivesIn() {
        CollectedCacheDependencies.Reduced reduced = reduce(children("/sites/mysite/contents/posts", 150));

        assertTrue(reduced.paths.isEmpty());
        assertEquals(Set.of(regexp("/sites/mysite/contents/posts")), reduced.regexps);
        String regexp = reduced.regexps.iterator().next();
        // an edited title lands on a subnode of the item
        assertTrue("/sites/mysite/contents/posts/item-1/j:translation_en".matches(regexp));
        // the folder may itself be one of the linked nodes: renaming it must flush the fragment
        assertTrue("/sites/mysite/contents/posts".matches(regexp));
        assertFalse("/sites/mysite/contents/events/item-1".matches(regexp));
    }

    @Test
    public void shouldKeepALoneLinkOutsideTheListingExact() {
        Set<String> dependencies = children("/sites/mysite/home", 120);
        dependencies.add("/sites/mysite/files/logo.png");

        CollectedCacheDependencies.Reduced reduced = reduce(dependencies);

        assertEquals(Set.of("/sites/mysite/files/logo.png"), new HashSet<>(reduced.paths));
        assertEquals(Set.of(regexp("/sites/mysite/home")), reduced.regexps);
    }

    @Test
    public void shouldMergeOnlyWhatTheLimitNeeds() {
        Set<String> dependencies = children("/sites/mysite/contents/events", 80);
        dependencies.addAll(children("/sites/mysite/contents/posts", 80));

        CollectedCacheDependencies.Reduced reduced = reduce(dependencies);

        // merging one folder brings 160 entries down to 81, so the other one stays exact
        assertEquals(Set.of(regexp("/sites/mysite/contents/events")), reduced.regexps);
        assertEquals(children("/sites/mysite/contents/posts", 80), new HashSet<>(reduced.paths));
    }

    @Test
    public void shouldMergeTheBiggestFolderFirstAtOneDepth() {
        Set<String> dependencies = children("/sites/mysite/contents/events", 30);
        dependencies.addAll(children("/sites/mysite/contents/posts", 90));

        CollectedCacheDependencies.Reduced reduced = reduce(dependencies);

        assertEquals(Set.of(regexp("/sites/mysite/contents/posts")), reduced.regexps);
        assertEquals(30, reduced.paths.size());
    }

    @Test
    public void shouldMergeUpwardsUntilTheEntriesFit() {
        Set<String> dependencies = new HashSet<>();
        for (int i = 0; i < 150; i++) {
            dependencies.add("/sites/mysite/home/section-" + i + "/page");
        }

        CollectedCacheDependencies.Reduced reduced = reduce(dependencies);

        // no section holds two pages, so the merge goes up to the folder that holds the sections
        assertTrue(reduced.paths.isEmpty());
        assertEquals(Set.of(regexp("/sites/mysite/home")), reduced.regexps);
    }

    @Test
    public void shouldCompareWholeSegmentsInsideOneSite() {
        Set<String> dependencies = children("/sites/mysite/contents", 60);
        dependencies.addAll(children("/sites/mysite/contents2", 60));

        CollectedCacheDependencies.Reduced reduced = reduce(dependencies);

        assertEquals(Set.of(regexp("/sites/mysite/contents")), reduced.regexps);
        // contents is a character prefix of contents2, but not an ancestor of it
        assertFalse("/sites/mysite/contents2/item-1".matches(reduced.regexps.iterator().next()));
        assertEquals(children("/sites/mysite/contents2", 60), new HashSet<>(reduced.paths));
    }

    @Test
    public void shouldNeverMergeAboveTheSite() {
        Set<String> dependencies = new HashSet<>();
        for (int i = 0; i < 150; i++) {
            dependencies.add("/sites/site-" + i + "/home");
        }

        CollectedCacheDependencies.Reduced reduced = reduce(dependencies);

        // no folder below /sites holds two links: the paths stay exact, above the limit
        assertEquals(dependencies, new HashSet<>(reduced.paths));
        assertTrue(reduced.regexps.isEmpty());
    }

    @Test
    public void shouldNeverMergeToTheRepositoryRoot() {
        Set<String> dependencies = children("/sites/mysite/contents", 80);
        dependencies.addAll(children("/users/root/files", 80));

        CollectedCacheDependencies.Reduced reduced = reduce(dependencies);

        assertEquals(81, reduced.paths.size() + reduced.regexps.size());
        for (String regexp : reduced.regexps) {
            assertFalse(regexp + " covers another site", "/sites/other/contents/whatever".matches(regexp));
        }
    }

    @Test
    public void shouldDropModuleDependenciesAsTheCoreCacheDoes() {
        Set<String> dependencies = children("/sites/mysite/contents/posts", 150);
        dependencies.add("/modules/mymodule/templates/one");

        CollectedCacheDependencies.Reduced reduced = reduce(dependencies);

        assertEquals(150, reduced.collected);
        assertEquals(Set.of(regexp("/sites/mysite/contents/posts")), reduced.regexps);
        assertTrue(reduce(Set.of("/modules/mymodule/templates/one")).paths.isEmpty());
    }

    @Test
    public void shouldQuoteThePathSoADotIsNotAWildcard() {
        CollectedCacheDependencies.Reduced reduced = reduce(children("/sites/mysite/files/my.docs", 150));
        String regexp = reduced.regexps.iterator().next();

        assertTrue("/sites/mysite/files/my.docs/item-1".matches(regexp));
        assertFalse("/sites/mysite/files/myXdocs/item-1".matches(regexp));
    }

    @Test
    public void shouldCollectForTheFragmentBeingRendered() {
        HttpServletRequest request = request();
        Resource parent = resource("/sites/mysite/home");
        Resource child = resource("/sites/mysite/home/area/child");

        startRender(request, parent, true);
        CollectedCacheDependencies.collect(request, "/sites/mysite/home/about");
        // a nested fragment: the render chain pushes the child's collector, then restores the parent's
        Object parentCollector = request.getAttribute(CollectedCacheDependencies.ATTRIBUTE);
        startRender(request, child, true);
        CollectedCacheDependencies.collect(request, "/sites/mysite/files/logo.png");
        assertEquals(Set.of("/sites/mysite/files/logo.png"), CollectedCacheDependencies.collected(request, child));
        request.setAttribute(CollectedCacheDependencies.ATTRIBUTE, parentCollector);
        CollectedCacheDependencies.collect(request, "/sites/mysite/home/contact");

        assertEquals(Set.of("/sites/mysite/home/about", "/sites/mysite/home/contact"),
                CollectedCacheDependencies.collected(request, parent));
    }

    @Test
    public void shouldTellTwoRendersOfOneNodeApart() {
        HttpServletRequest request = request();
        Resource first = resource("/sites/mysite/home/teaser");
        Resource second = resource("/sites/mysite/home/teaser");

        startRender(request, first, true);
        CollectedCacheDependencies.collect(request, "/sites/mysite/home/about");

        assertTrue(CollectedCacheDependencies.collected(request, second).isEmpty());
        assertEquals(Set.of("/sites/mysite/home/about"), CollectedCacheDependencies.collected(request, first));
    }

    @Test
    public void shouldCollectNothingOutsideAFragment() {
        HttpServletRequest request = request();

        CollectedCacheDependencies.collect(request, "/sites/mysite/home/about");

        assertTrue(CollectedCacheDependencies.collected(request, resource("/sites/mysite/home")).isEmpty());
    }

    @Test
    public void shouldCollectNothingForAViewThatOptedOut() {
        HttpServletRequest request = request();
        Resource resource = resource("/sites/mysite/home");

        startRender(request, resource, false);
        CollectedCacheDependencies.collect(request, "/sites/mysite/home/about");

        assertTrue(CollectedCacheDependencies.collected(request, resource).isEmpty());
    }
}
