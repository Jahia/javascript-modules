package org.jahia.modules.javascript.modules.engine.js;

import org.graalvm.polyglot.proxy.ProxyObject;
import org.jahia.modules.javascript.modules.engine.js.injector.OSGiServiceInjector;
import org.jahia.modules.javascript.modules.engine.js.server.*;
import org.jahia.modules.javascript.modules.engine.js.server.gql.GQLHelper;
import org.jahia.modules.javascript.modules.engine.jsengine.ContextProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.lang.reflect.InvocationTargetException;
import java.util.HashMap;
import java.util.Map;

/**
 * Global JS injected into runtime, responsible for exposing server JAVA backend
 * to the JS runtime
 * But also for exposing shared libraries to the JS runtime
 * And finally can be enriched by the externalized js library to provide
 * mirroring of the JAVA backend and ensure auto-completion.
 */
public class JavascriptModulesLibraryBuilder {
    private static final Logger logger = LoggerFactory.getLogger(JavascriptModulesLibraryBuilder.class);

    private final ProxyObject server;

    private Map<String, Object> sharedLibraries = new HashMap<>();

    public JavascriptModulesLibraryBuilder(ContextProvider contextProvider) {
        Map<String, Object> server = new HashMap<>();
        server.put("config", new ConfigHelper(contextProvider));
        server.put("registry", new RegistryHelper(contextProvider));
        server.put("render", new RenderHelper(contextProvider));
        server.put("gql", new GQLHelper(contextProvider));
        server.put("osgi", new OSGiHelper(contextProvider));
        server.put("jcr", new JcrHelper());

        for (Map.Entry<String, Object> entry : server.entrySet()) {
            try {
                OSGiServiceInjector.handleMethodInjection(entry.getValue());
            } catch (IllegalAccessException | InvocationTargetException e) {
                logger.error("Cannot inject services for {} helper", entry.getKey(), e);
            }
        }
        this.server = ProxyObject.fromMap(server);
    }

    public ProxyObject getServer() {
        return server;
    }

    public void addSharedLibrary(String name, Object value) {
        sharedLibraries.put(name, value);
    }

    public Object getSharedLibrary(String name) {
        return sharedLibraries.get(name);
    }
}
