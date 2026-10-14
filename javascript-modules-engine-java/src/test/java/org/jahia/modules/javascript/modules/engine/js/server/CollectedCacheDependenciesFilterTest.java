package org.jahia.modules.javascript.modules.engine.js.server;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import java.lang.reflect.Proxy;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.Set;
import java.util.stream.Collectors;

import javax.servlet.http.HttpServletRequest;

import org.jahia.services.render.RenderContext;
import org.jahia.services.render.Resource;
import org.jahia.services.render.filter.AbstractFilter;
import org.jahia.services.render.filter.RenderChain;
import org.junit.Before;
import org.junit.Test;

/**
 * Runs {@link CollectedCacheDependenciesFilter} in a real {@link RenderChain},
 * between a cache filter and a view that stand in for those of Jahia.
 */
public class CollectedCacheDependenciesFilterTest {

    private RenderContext renderContext;
    // keyed by identity: Resource overrides equals, and two renders of one node are two fragments
    /** The resources the cache stores, and the dependencies each one had when the cache stored it. */
    private final Set<Resource> cached = Collections.newSetFromMap(new IdentityHashMap<>());
    private final Map<Resource, Set<String>> stored = new IdentityHashMap<>();
    /** What each view does while it renders. */
    private final Map<Resource, Runnable> views = new IdentityHashMap<>();
    private final Set<Resource> optedOut = Collections.newSetFromMap(new IdentityHashMap<>());

    /** Stands in for AggregateCacheFilter: it sets the cache key of a fragment it stores, and removes it in execute. */
    private final AbstractFilter cache = new AbstractFilter() {
        {
            setPriority(16);
        }

        @Override
        public String prepare(RenderContext renderContext, Resource resource, RenderChain chain) {
            if (cached.contains(resource)) {
                resource.getModuleParams().put(CollectedCacheDependenciesFilter.CACHE_KEY, "key");
            }
            return null;
        }

        @Override
        public String execute(String previousOut, RenderContext renderContext, Resource resource, RenderChain chain) {
            if (resource.getModuleParams().remove(CollectedCacheDependenciesFilter.CACHE_KEY) != null) {
                Set<String> dependencies = new HashSet<>(resource.getDependencies());
                dependencies.addAll(resource.getRegexpDependencies());
                dependencies.remove(resource.getNodePath());
                stored.put(resource, dependencies);
            }
            return previousOut;
        }
    };

    private final CollectedCacheDependenciesFilter filter = new CollectedCacheDependenciesFilter() {
        @Override
        Properties viewProperties(RenderContext renderContext, Resource resource) {
            Properties properties = new Properties();
            if (optedOut.contains(resource)) {
                properties.setProperty(DISABLE_PROPERTY, "false");
            }
            return properties;
        }
    };

    /** Stands in for the script: it runs the view of the resource. */
    private final AbstractFilter script = new AbstractFilter() {
        {
            setPriority(100);
        }

        @Override
        public String prepare(RenderContext renderContext, Resource resource, RenderChain chain) {
            views.getOrDefault(resource, () -> { }).run();
            return "<div/>";
        }
    };

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
                        case "removeAttribute":
                            attributes.remove(args[0]);
                            return null;
                        default:
                            throw new UnsupportedOperationException(method.getName());
                    }
                });
    }

    private static Resource resource(String path) {
        return new Resource(path, path, null, "html", "default", "module");
    }

    @Before
    public void setUp() {
        renderContext = new RenderContext(request(), null, null);
    }

    private void render(Resource resource) throws Exception {
        new RenderChain(cache, filter, script).doFilter(renderContext, resource);
    }

    private void collect(String path) {
        CollectedCacheDependencies.collect(renderContext.getRequest(), path);
    }

    @Test
    public void shouldRegisterWhatTheViewCollectedBeforeTheCacheStoresIt() throws Exception {
        Resource page = resource("/sites/mysite/home");
        cached.add(page);
        views.put(page, () -> collect("/sites/mysite/home/about"));

        render(page);

        assertEquals(Set.of("/sites/mysite/home/about"), stored.get(page));
        assertNull(renderContext.getRequest().getAttribute(CollectedCacheDependencies.ATTRIBUTE));
    }

    @Test
    public void shouldKeepTheCollectorOfANestedFragmentApart() throws Exception {
        Resource page = resource("/sites/mysite/home");
        Resource teaser = resource("/sites/mysite/home/area/teaser");
        cached.add(page);
        cached.add(teaser);
        views.put(teaser, () -> collect("/sites/mysite/files/logo.png"));
        views.put(page, () -> {
            collect("/sites/mysite/home/about");
            try {
                render(teaser);
            } catch (Exception e) {
                throw new IllegalStateException(e);
            }
            collect("/sites/mysite/home/contact");
        });

        render(page);

        assertEquals(Set.of("/sites/mysite/files/logo.png"), stored.get(teaser));
        assertEquals(Set.of("/sites/mysite/home/about", "/sites/mysite/home/contact"), stored.get(page));
    }

    @Test
    public void shouldCollectIntoTheEnclosingFragmentWhatTheCacheDoesNotStore() throws Exception {
        Resource page = resource("/sites/mysite/home");
        Resource include = resource("/sites/mysite/home/area/include");
        cached.add(page);
        views.put(include, () -> collect("/sites/mysite/files/logo.png"));
        views.put(page, () -> {
            try {
                render(include);
            } catch (Exception e) {
                throw new IllegalStateException(e);
            }
        });

        render(page);

        assertEquals(Set.of("/sites/mysite/files/logo.png"), stored.get(page));
        assertEquals(List.of(page), new ArrayList<>(stored.keySet()));
    }

    @Test
    public void shouldCollectNothingForAViewThatOptedOut() throws Exception {
        Resource page = resource("/sites/mysite/home");
        cached.add(page);
        optedOut.add(page);
        views.put(page, () -> collect("/sites/mysite/home/about"));

        render(page);

        assertEquals(Set.of(), stored.get(page));
    }

    @Test
    public void shouldCollectNothingOutsideACachedFragment() throws Exception {
        Resource page = resource("/sites/mysite/home");
        views.put(page, () -> collect("/sites/mysite/home/about"));

        render(page);

        assertEquals(Set.of(), page.getDependencies().stream()
                .filter(path -> !path.equals(page.getNodePath())).collect(Collectors.toSet()));
        assertNull(renderContext.getRequest().getAttribute(CollectedCacheDependencies.ATTRIBUTE));
    }
}
