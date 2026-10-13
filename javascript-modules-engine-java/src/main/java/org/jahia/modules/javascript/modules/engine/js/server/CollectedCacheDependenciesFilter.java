package org.jahia.modules.javascript.modules.engine.js.server;

import java.util.Properties;
import java.util.Set;

import javax.jcr.RepositoryException;

import org.jahia.api.Constants;
import org.jahia.services.render.RenderContext;
import org.jahia.services.render.Resource;
import org.jahia.services.render.View;
import org.jahia.services.render.filter.AbstractFilter;
import org.jahia.services.render.filter.RenderChain;
import org.jahia.services.render.filter.RenderFilter;
import org.jahia.services.render.scripting.Script;
import org.osgi.service.component.annotations.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Gives each resource that the cache stores as a fragment a collector for the
 * cache dependencies its view resolves, and registers what it collected.
 * <p>
 * The conditions are those of {@code AggregateCacheFilter}. A resource that
 * filter skips, such as an include, a wrapper, an option or a fragment cached
 * with its parent, gets no collector of its own. Its view then collects into the
 * collector of the enclosing fragment, which holds its markup.
 * <p>
 * The priority puts {@link #execute} after the script and the wrappers, and
 * before the cache filter (16) stores the dependencies of the fragment. A render
 * filter whose priority is below this one runs its own {@code execute} after
 * this filter, so a path it collects there is not registered.
 */
@Component(service = RenderFilter.class, immediate = true)
public class CollectedCacheDependenciesFilter extends AbstractFilter {

    private static final Logger logger = LoggerFactory.getLogger(CollectedCacheDependenciesFilter.class);

    /** The view property that turns autocollection off for a view. */
    static final String DISABLE_PROPERTY = "cache.autocollectDependencies";

    static final float PRIORITY = 17f;

    /**
     * The request attribute of {@code AggregateCacheFilter.SKIP_AGGREGATION}. The
     * core this module compiles against does not declare it, and sets no such
     * attribute.
     */
    static final String SKIP_AGGREGATION = "aggregateFilter.skip";

    public CollectedCacheDependenciesFilter() {
        setPriority(PRIORITY);
        setDescription("Registers the cache dependencies a JavaScript view autocollected while it rendered.");
        setApplyOnModes("live");
        setSkipOnTemplateTypes("json");
        setSkipOnConfigurations("include,wrapper,option");
        addCondition((renderContext, resource) ->
                !Boolean.TRUE.equals(resource.getModuleParams().get(Constants.TO_CACHE_WITH_PARENT_FRAGMENT))
                        && !Boolean.TRUE.equals(renderContext.getRequest().getAttribute(SKIP_AGGREGATION)));
    }

    @Override
    public String prepare(RenderContext renderContext, Resource resource, RenderChain chain) throws Exception {
        chain.pushAttribute(renderContext.getRequest(), CollectedCacheDependencies.ATTRIBUTE,
                new CollectedCacheDependencies.Collector(resource, isEnabled(renderContext, resource)));
        return null;
    }

    @Override
    public String execute(String previousOut, RenderContext renderContext, Resource resource, RenderChain chain)
            throws Exception {
        Set<String> paths = CollectedCacheDependencies.collected(renderContext.getRequest(), resource);
        CollectedCacheDependencies.register(resource, paths);
        return previousOut;
    }

    private static boolean isEnabled(RenderContext renderContext, Resource resource) {
        try {
            Script script = resource.getScript(renderContext);
            View view = script == null ? null : script.getView();
            Properties properties = view == null ? null : view.getProperties();
            return properties == null || !"false".equals(properties.getProperty(DISABLE_PROPERTY));
        } catch (RepositoryException e) {
            logger.debug("Cannot resolve the view of {}, its dependencies are collected", resource, e);
            return true;
        }
    }
}
