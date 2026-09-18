package org.jahia.modules.javascript.modules.engine.dev;

import org.jahia.services.render.RenderContext;
import org.jahia.services.render.Resource;
import org.jahia.services.render.filter.AbstractFilter;
import org.jahia.services.render.filter.RenderChain;
import org.jahia.services.render.filter.RenderFilter;
import org.jahia.settings.SettingsBean;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;

/**
 * Puts the reload script into pages while a module is being developed.
 *
 * <p>A rebuilt module is swapped into the engine without the browser knowing, so the page keeps
 * showing the output of code that no longer exists. The script watches the module's reload count
 * and reloads the page when it moves. It is addressed through the engine's own development path, so
 * the browser keeps talking to Jahia and no second origin is involved.
 */
@Component(service = RenderFilter.class, immediate = true)
public class DevClientFilter extends AbstractFilter {
    private DevServerRegistry registry;

    @Reference
    public void setRegistry(DevServerRegistry registry) {
        this.registry = registry;
    }

    @Activate
    public void activate() {
        // after the aggregation and asset filters have had their say, on whole pages only
        setPriority(19.5f);
        setApplyOnConfigurations("page");
        setApplyOnTemplateTypes("html");
    }

    @Override
    public String execute(String previousOut, RenderContext renderContext, Resource resource, RenderChain chain) {
        SettingsBean settings = SettingsBean.getInstance();
        if (settings == null || !settings.isDevelopmentMode()) {
            return previousOut;
        }
        String scripts = registry.clientScript(renderContext.getRequest().getContextPath());
        if (scripts.isEmpty()) {
            return previousOut;
        }
        int head = previousOut.indexOf("</head>");
        if (head < 0) {
            // no head to inject into: a page fragment, or a template that writes its own document
            return previousOut;
        }
        return previousOut.substring(0, head) + scripts + previousOut.substring(head);
    }
}
