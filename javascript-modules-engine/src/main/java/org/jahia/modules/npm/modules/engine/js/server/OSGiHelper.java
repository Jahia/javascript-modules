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
import org.jahia.data.templates.JahiaTemplatesPackage;
import org.jahia.modules.npm.modules.engine.js.injector.OSGiService;
import org.jahia.modules.npm.modules.engine.jsengine.ContextProvider;
import org.jahia.modules.npm.modules.engine.jsengine.GraalVMEngine;
import org.jahia.services.render.RenderException;
import org.jahia.services.templates.JahiaTemplateManagerService;
import org.osgi.framework.Bundle;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.inject.Inject;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Helper class to make it possible to access OSGi bundle resources from the JavaScript engine
 */
public class OSGiHelper {
    private static final Logger logger = LoggerFactory.getLogger(OSGiHelper.class);

    private final ContextProvider contextProvider;

    private JahiaTemplateManagerService templateManagerService;

    public OSGiHelper(ContextProvider contextProvider) {
        this.contextProvider = contextProvider;
    }

    @Inject
    @OSGiService
    public void setTemplateManagerService(JahiaTemplateManagerService templateManagerService) {
        this.templateManagerService = templateManagerService;
    }

    /**
     * Get the Osgi Bundle by symbolic name
     * @param symbolicName the symbolic name for the bundle
     * @return if successful, the Bundle, otherwise null
     */
    public Bundle getBundle(String symbolicName) {
        JahiaTemplatesPackage packageById = templateManagerService.getTemplatePackageById(symbolicName);
        if (packageById != null) {
            return packageById.getBundle();
        }
        return null;
    }

    /**
     * Load a resource from an OSGi bundle
     * @param bundle the bundle to load the resource from
     * @param path the path to the resource in the bundle
     * @param optional if false an error message will be logged if the resource is not found, otherwise null will be returned
     * @return a String containing the content of the resource if it was found, null otherwise
     * @throws RenderException
     */
    public String loadResource(Bundle bundle, String path, boolean optional) throws RenderException {
        String result = GraalVMEngine.loadResource(bundle, path);
        if (!optional && result == null) {
            // todo (BACKLOG-21263) handle exception correctly in NPM views
            //throw new RenderException(String.format("Unable to load resource: %s from bundle: %s", path, bundle.getSymbolicName()));
            logger.error("Unable to load resource: {} from bundle: {}", path, bundle.getSymbolicName());
        }
        return result;
    }

    /**
     * Load a properties resource from an OSGi bundle
     * @param bundle the bundle to load the resource from
     * @param path the path to the resource in the bundle
     * @return A Map&lt;String,String&gt; containing the properties
     * @throws RenderException
     */
    public ProxyObject loadPropertiesResource(Bundle bundle, String path) throws RenderException {
        URL url = bundle.getResource(path);
        if (url != null) {
            Properties properties = new Properties();
            try (InputStream inStream = url.openStream()) {
                properties.load(inStream);
                return ProxyObject.fromMap(properties.entrySet().stream().collect(
                        Collectors.toMap(
                                e -> String.valueOf(e.getKey()),
                                e -> String.valueOf(e.getValue()),
                                (prev, next) -> next
                        )));
            } catch (IOException e) {
                logger.error("Error while loading properties {} for bundle {}", path, bundle.getSymbolicName(), e);
            }
        }

        return null;
    }

    public Collection<String> lookupComponentPaths(Bundle bundle, String extension) {
        Enumeration<String> namespaces = bundle.getEntryPaths("components");
        Set<String> components = new HashSet<>();
        if (namespaces != null) {
            while (namespaces.hasMoreElements()) {
                String namespace = namespaces.nextElement();
                components.addAll(parseNamespace(bundle, namespace, extension));
            }
        }
        return components;
    }

    private Set<String> parseNamespace(Bundle bundle, String namespace, String extension) {
        Enumeration<String> componentsName = bundle.getEntryPaths(namespace);
        Set<String> components = new HashSet<>();
        while (componentsName.hasMoreElements()) {
            String componentName = componentsName.nextElement();
            Enumeration<String> filePaths = bundle.getEntryPaths(componentName);
            if (filePaths != null) {
                while (filePaths.hasMoreElements()) {
                    String filePath = filePaths.nextElement();
                    if (filePath.endsWith(extension)) {
                        components.add(filePath);
                    }
                }
            }
        }
        return components;
    }
}
