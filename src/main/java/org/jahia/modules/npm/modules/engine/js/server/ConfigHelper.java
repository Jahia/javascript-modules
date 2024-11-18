package org.jahia.modules.npm.modules.engine.js.server;

import org.graalvm.polyglot.proxy.ProxyArray;
import org.graalvm.polyglot.proxy.ProxyObject;
import org.jahia.modules.npm.modules.engine.jsengine.ContextProvider;
import org.jahia.taglibs.functions.Functions;

import java.util.HashMap;

/**
 * Java helper to expose OSGi configuration values to Javascript code
 */
public class ConfigHelper {
    private final ContextProvider context;

    public ConfigHelper(ContextProvider context) {
        this.context = context;
    }

    /**
     * Get the list of OSGi configuration PIDs
     * @return an array of String containing the OSGi configuration PIDs
     */
    public ProxyArray getConfigPids() {
        return ProxyArray.fromArray(Functions.getConfigPids().toArray());
    }

    /**
     * Get the list of OSGi configuration factory PIDs for a given factory ID
     * @return an array of String containing the OSGi configuration factory PIDs
     */
    public ProxyArray getConfigFactoryIdentifiers(String factoryPid) {
        return ProxyArray.fromArray(Functions.getConfigFactoryIdentifiers(factoryPid).toArray());
    }

    /**
     * Get the configuration values for a given OSGi configuration PID
     * @param configPid the unique identifier of the OSGi configuration
     * @return a Map&lt;String, Object&gt; containing the configuration values
     */
    public ProxyObject getConfigValues(String configPid) {
        return ProxyObject.fromMap(new HashMap<>(Functions.getConfigValues(configPid)));
    }

    /**
     * Get the configuration values for a given OSGi configuration factory PID and factory identifier
     * @param factoryPid the factory PID
     * @param factoryIdentifier the factory identifier within the given factory PID
     * @return a Map&lt;String, Object&gt; containing the configuration values
     */
    public ProxyObject getConfigFactoryValues(String factoryPid, String factoryIdentifier) {
        return ProxyObject.fromMap(new HashMap<>(Functions.getConfigFactoryValues(factoryPid, factoryIdentifier)));
    }

    /**
     * Get a single configuration value for a given OSGi configuration PID and a property key
     * @param configPid the unique identifier of the OSGi configuration
     * @param key the property key
     * @return a String containing the configuration value
     */
    public String getConfigValue(String configPid, String key) {
        return Functions.getConfigValue(configPid, key);
    }

    /**
     * Get a single configuration value for a given OSGi configuration factory PID, factory identifier and a
     * property key
     * @param factoryPid the factory PID
     * @param factoryIdentifier the factory identifier within the given factory PID
     * @param key the property key
     * @return a String containing the configuration value
     */
    public String getConfigFactoryValue(String factoryPid, String factoryIdentifier, String key) {
        return Functions.getConfigFactoryValue(factoryPid, factoryIdentifier, key);
    }
}
