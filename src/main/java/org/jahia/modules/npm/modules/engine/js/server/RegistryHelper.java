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
package org.jahia.modules.npm.modules.engine.js.server;

import org.graalvm.polyglot.proxy.ProxyObject;
import org.jahia.modules.npm.modules.engine.jsengine.ContextProvider;
import org.jahia.modules.npm.modules.engine.jsengine.Registry;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Helper class to make it possible to access the registry from the JavaScript engine
 */
public class RegistryHelper {
    private final ContextProvider context;

    public RegistryHelper(ContextProvider context) {
        this.context = context;
    }

    /**
     * Get an object from the registry by type and key
     * @param type the type of the object to retrieve
     * @param key the key in the type of the object to retrieve
     * @return the object if found as a Map&lt;String,Object&gt;, otherwise null
     */
    public Object get(String type, String key) {
        Map<String,Object> registryEntry = context.getRegistry().get(type, key);
        // We need this check because ProxyObject.fromMap doesn't do it.
        if (registryEntry == null) {
            return null;
        }
        return ProxyObject.fromMap(registryEntry);
    }

    /**
     * Search objects from the registry by using a map filter. The filter is a map of key-value pairs that will be used
     * to match objects that have the same values for the keys specified in the filter.
     * @param filter a map of key-value pairs to filter the objects to retrieve
     * @return a List of matching objects
     */
    public List<Object> find(Map<String, Object> filter) {
        return context.getRegistry().find(filter).stream().map(ProxyObject::fromMap).collect(Collectors.toList());
    }

    /**
     * Search objects from the registry by using a map filter and an order by clause. The filter is a map of key-value
     * pairs that will be used to match objects that have the same values for the keys specified in the filter.
     * @param filter a map of key-value pairs to filter the objects to retrieve
     * @param orderBy a string representing the key to use to order the resulting objects. Not that this only works if
     *                the key refers to an integer value
     * @return a sorted List of matching objects
     */
    public List<Object> find(Map<String, Object> filter, String orderBy) {
        return context.getRegistry().find(filter, orderBy).stream().map(ProxyObject::fromMap).collect(Collectors.toList());
    }

    /**
     * Add a new object in the registry. The object is a map of key-value pairs that will be stored using the specified
     * type and key. Note that if the object already exists, an exception will be thrown. If you want to force the
     * object to be store you should instead use the addOrReplace method.
     * @param type the type of the object to store
     * @param key the key of the object to store within the type
     * @param arguments a Map of key-value pairs representing the object to store
     */
    public void add(String type, String key, Map<String, Object>... arguments) {
        context.getRegistry().add(type, key, arguments);
    }

    /**
     * Add a new object in the registry or replace an existing one. The object is a map of key-value pairs that will be
     * stored using the specified type and key. If the object already exists, it will be replaced by the new one.
     * @param type the type of the object to store
     * @param key the key of the object to store within the type
     * @param arguments a Map of key-value pairs representing the object to store
     */
    public void addOrReplace(String type, String key, Map<String, Object>... arguments) {
        context.getRegistry().addOrReplace(type, key, arguments);
    }

    /**
     * Remove an object from the registry by type and key
     * @param type the type of the object to remove
     * @param key the key of the object to remove within the type
     */
    public void remove(String type, String key) {
        context.getRegistry().remove(type, key);
    }

    public Registry getRegistry() {
        return context.getRegistry();
    }
}
