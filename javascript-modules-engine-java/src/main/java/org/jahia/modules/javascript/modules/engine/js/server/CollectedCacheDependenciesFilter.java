package org.jahia.modules.javascript.modules.engine.js.server;

import java.util.Properties;
import java.util.Set;

import javax.jcr.RepositoryException;

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
 * Registers on each rendered resource the cache dependencies its view
 * autocollected, unless the view sets {@value #DISABLE_PROPERTY} to
 * {@code false}.
 * <p>
 * The priority puts {@link #execute} after the script and the wrappers, and
 * before the cache filters (16 and 16.5) store the dependencies of the fragment.
 */
@Component(service = RenderFilter.class, immediate = true)
public class CollectedCacheDependenciesFilter extends AbstractFilter {

    private static final Logger logger = LoggerFactory.getLogger(CollectedCacheDependenciesFilter.class);

    /** The view property that turns autocollection off for a view. */
    static final String DISABLE_PROPERTY = "cache.autocollectDependencies";

    static final float PRIORITY = 17f;

    public CollectedCacheDependenciesFilter() {
        setPriority(PRIORITY);
        setDescription("Registers the cache dependencies a JavaScript view autocollected while it rendered.");
    }

    @Override
    public String execute(String previousOut, RenderContext renderContext, Resource resource, RenderChain chain)
            throws Exception {
        Set<String> paths = CollectedCacheDependencies.take(renderContext.getRequest(), resource);
        if (!paths.isEmpty() && isEnabled(renderContext, resource)) {
            CollectedCacheDependencies.register(resource, paths);
        }
        return previousOut;
    }

    private static boolean isEnabled(RenderContext renderContext, Resource resource) {
        try {
            Script script = resource.getScript(renderContext);
            View view = script == null ? null : script.getView();
            Properties properties = view == null ? null : view.getProperties();
            return properties == null || !"false".equals(properties.getProperty(DISABLE_PROPERTY));
        } catch (RepositoryException e) {
            logger.debug("Cannot resolve the view of {}, its autocollected dependencies are registered", resource, e);
            return true;
        }
    }
}
