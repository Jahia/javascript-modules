/*
 * Copyright (C) 2002-2023 Jahia Solutions Group SA. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.jahia.modules.javascript.modules.engine.registrars;

import org.jahia.modules.javascript.modules.engine.jsengine.GraalVMEngine;
import org.osgi.framework.Bundle;
import org.osgi.framework.BundleContext;
import org.osgi.framework.ServiceRegistration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Collection;
import java.util.Dictionary;
import java.util.HashMap;
import java.util.Hashtable;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Base class for registrars that expose JavaScript registry entries of a given type as OSGi services
 * implementing a Jahia extension interface.
 *
 * <p>For each bundle, {@link #register(Bundle)} finds the registry entries matching the registrar's type,
 * wraps each of them in a bridge built by {@link #createBridge(Map)} and publishes the bridge as an OSGi
 * service of the registrar's service class. Registrations are tracked per bundle and released in
 * {@link #unregister(Bundle)}. A failure on one entry never prevents the other entries from being processed.
 *
 * <p>Bridges must never capture JS function handles: GraalVM contexts are pooled and invalidated on every
 * module (un)deploy, so a bridge must re-resolve its registry entry inside
 * {@link GraalVMEngine#doWithContext} on every invocation.
 *
 * <p>Note that Declarative Services annotations are not processed on inherited members, so concrete
 * subclasses must declare their own {@code @Component}, {@code @Reference} and {@code @Activate} members
 * and assign the {@link #graalVMEngine} and {@link #bundleContext} fields.
 */
public abstract class AbstractServiceRegistrar<S> implements Registrar {

    private static final Logger logger = LoggerFactory.getLogger(AbstractServiceRegistrar.class);

    private final Class<S> serviceClass;
    private final String registryType;
    private final Map<Bundle, Collection<ServiceRegistration<S>>> registrations = new ConcurrentHashMap<>();

    protected GraalVMEngine graalVMEngine;
    protected BundleContext bundleContext;

    protected AbstractServiceRegistrar(Class<S> serviceClass, String registryType) {
        this.serviceClass = serviceClass;
        this.registryType = registryType;
    }

    public String getRegistryType() {
        return registryType;
    }

    /**
     * Builds the OSGi service bridge for a single registry entry. The returned object is published as a
     * service of the registrar's service class.
     */
    protected abstract S createBridge(Map<String, Object> registryEntry);

    /**
     * Hook invoked before a bridge is created and registered, e.g. to emit key-collision warnings.
     */
    protected void beforeRegister(Bundle bundle, Map<String, Object> registryEntry) {
        // no-op by default
    }

    /**
     * Hook providing the OSGi service properties for a registry entry.
     */
    protected Dictionary<String, Object> getServiceProperties(Map<String, Object> registryEntry) {
        return new Hashtable<>();
    }

    @Override
    public void register(Bundle bundle) {
        List<Map<String, Object>> entries = graalVMEngine.doWithContext(contextProvider -> {
            Map<String, Object> filter = new HashMap<>();
            filter.put("type", registryType);
            filter.put("bundleKey", bundle.getSymbolicName());
            return contextProvider.getRegistry().find(filter);
        });

        Collection<ServiceRegistration<S>> set = registrations.computeIfAbsent(bundle, b -> ConcurrentHashMap.newKeySet());
        for (Map<String, Object> entry : entries) {
            try {
                beforeRegister(bundle, entry);
                set.add(bundleContext.registerService(serviceClass, createBridge(entry), getServiceProperties(entry)));
            } catch (Exception e) {
                logger.error("Unable to register {} '{}' from bundle {}", registryType, entry.get("key"),
                        bundle.getSymbolicName(), e);
            }
        }
    }

    @Override
    public void unregister(Bundle bundle) {
        Collection<ServiceRegistration<S>> set = registrations.remove(bundle);
        if (set != null) {
            for (ServiceRegistration<S> registration : set) {
                try {
                    registration.unregister();
                } catch (Exception e) {
                    logger.warn("Error unregistering a {} service of bundle {}", registryType,
                            bundle.getSymbolicName(), e);
                }
            }
        }
    }
}
