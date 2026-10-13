package org.jahia.modules.javascript.modules.engine.js.server;

import java.util.Set;

import org.jahia.services.render.RenderContext;
import org.jahia.services.render.Resource;
import org.jahia.services.render.filter.AbstractFilter;
import org.jahia.services.render.filter.RenderChain;
import org.jahia.services.render.filter.RenderFilter;
import org.osgi.service.component.annotations.Component;

/**
 * Gives each rendered resource a collector for the cache dependencies its view
 * resolves, and registers what it collected.
 * <p>
 * The priority puts {@link #execute} after the script and the wrappers, and
 * before the cache filters (16 and 16.5) store the dependencies of the fragment.
 * A fragment served from the cache stops the chain before this filter, so it
 * collects nothing. A render filter whose priority is below this one runs its
 * own {@code execute} after this filter, so a path it collects there is not
 * registered.
 */
@Component(service = RenderFilter.class, immediate = true)
public class CollectedCacheDependenciesFilter extends AbstractFilter {

    static final float PRIORITY = 17f;

    public CollectedCacheDependenciesFilter() {
        setPriority(PRIORITY);
        setDescription("Registers the cache dependencies a JavaScript view autocollected while it rendered.");
    }

    @Override
    public String prepare(RenderContext renderContext, Resource resource, RenderChain chain) throws Exception {
        chain.pushAttribute(renderContext.getRequest(), CollectedCacheDependencies.ATTRIBUTE,
                new CollectedCacheDependencies.Collector(resource));
        return null;
    }

    @Override
    public String execute(String previousOut, RenderContext renderContext, Resource resource, RenderChain chain)
            throws Exception {
        Set<String> paths = CollectedCacheDependencies.collected(renderContext.getRequest(), resource);
        CollectedCacheDependencies.register(resource, paths);
        return previousOut;
    }
}
