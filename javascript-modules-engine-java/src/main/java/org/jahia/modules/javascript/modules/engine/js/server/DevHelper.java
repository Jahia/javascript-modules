package org.jahia.modules.javascript.modules.engine.js.server;

import org.jahia.modules.javascript.modules.engine.dev.DevServerRegistry;
import org.jahia.modules.javascript.modules.engine.js.injector.OSGiService;

import javax.inject.Inject;

/**
 * Java helper telling JavaScript code whether a module is being served by a development server.
 *
 * <p>A module under {@code jahia dev} has its files served from the developer's machine rather than
 * from the deployed bundle, under a path the engine proxies. Views therefore have to address the
 * module's own files through that path to see the current state of the sources, which is what
 * {@code buildModuleFileUrl} uses this for.
 */
public class DevHelper {
    private DevServerRegistry registry;

    @Inject
    @OSGiService
    public void setRegistry(DevServerRegistry registry) {
        this.registry = registry;
    }

    /**
     * The path a module's files are served under while its development server is attached.
     *
     * @param module the module's OSGi symbolic name
     * @return the path prefix, servlet context path excluded, or null when the module is deployed
     *         normally — which is every module outside a development session
     */
    public String getBase(String module) {
        if (registry == null || module == null || !registry.isAttached(module)) {
            return null;
        }
        return DevServerRegistry.baseOf(module);
    }
}
