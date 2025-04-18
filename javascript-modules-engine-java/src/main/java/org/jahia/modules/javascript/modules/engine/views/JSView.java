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
package org.jahia.modules.javascript.modules.engine.views;

import org.jahia.data.templates.JahiaTemplatesPackage;
import org.jahia.modules.javascript.modules.engine.jsengine.ContextProvider;
import org.jahia.registries.ServicesRegistry;
import org.jahia.services.render.View;
import org.osgi.framework.Bundle;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.annotation.Nonnull;
import java.util.Map;
import java.util.Objects;
import java.util.Properties;

public class JSView implements View, Comparable<View> {

    private JahiaTemplatesPackage module;
    private final Bundle bundle;
    private final Map<String, Object> jsValues;
    private Properties properties;
    private Properties defaultProperties;
    private final String path;
    private final int priority;

    private final boolean isTemplate;

    private static final Logger logger = LoggerFactory.getLogger(JSView.class);

    public JSView(Map<String, Object> jsValues, Bundle bundle) {
        this.bundle = bundle;
        this.jsValues = jsValues;
        this.properties = new Properties();
        if (jsValues.containsKey("properties")) {
            this.properties.putAll((Map<?, ?>) jsValues.get("properties"));
        }

        // init some system info, like componentType: template or view
        String componentType = jsValues.containsKey("componentType") ? jsValues.get("componentType").toString() : null;
        if ((!"template".equals(componentType) && !"view".equals(componentType))) {
            logger.warn("Unrecognized componentType '{}' for view '{}', will be considered as a view", componentType, this.getKey());
        }
        this.isTemplate = "template".equals(componentType);

        this.defaultProperties = new Properties();
        this.path = bundle.getBundleId() + "/" + bundle.getSymbolicName() + "/" + getRegistryKey();
        this.priority = (int) jsValues.getOrDefault("priority", 0);
    }

    public Map<String, Object> getRegistryInstance(ContextProvider contextProvider) {
        return contextProvider.getRegistry().get("view", getRegistryKey());
    }

    public boolean isTemplate() {
        return isTemplate;
    }

    @Override
    public String getKey() {
        return jsValues.containsKey("name") ? jsValues.get("name").toString() : "default";
    }

    @Override
    public JahiaTemplatesPackage getModule() {
        if (module == null) {
            this.module = ServicesRegistry.getInstance().getJahiaTemplateManagerService().getTemplatePackageById(bundle.getSymbolicName());
        }
        return module;
    }

    @Override
    public String getModuleVersion() {
        return bundle != null && bundle.getVersion() != null ? bundle.getVersion().toString() : null;
    }

    @Override
    public String getDisplayName() {
        return jsValues.containsKey("displayName") ? jsValues.get("displayName").toString() : getKey();
    }

    @Override
    public String getFileExtension() {
        return "js";
    }

    @Override
    public String getPath() {
        return path;
    }

    public int getPriority() {
        return priority;
    }

    @Override
    public String getInfo() {
        return getPath();
    }

    @Override
    public Properties getProperties() {
        return properties;
    }

    public void setProperties(Properties properties) {
        this.properties = properties;
    }

    @Override
    public Properties getDefaultProperties() {
        return defaultProperties;
    }

    public void setDefaultProperties(Properties defaultProperties) {
        this.defaultProperties = defaultProperties;
    }

    public String getRegistryKey() {
        return jsValues.get("key").toString();
    }

    public String getNodeType() {
        return jsValues.get("nodeType").toString();
    }

    public String getTemplateType() {
        return jsValues.get("templateType").toString();
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof JSView)) return false;
        JSView jsView = (JSView) o;
        return getRegistryKey().equals(jsView.getRegistryKey()) &&
                getKey().equals(jsView.getKey()) &&
                getModule().equals(jsView.getModule()) &&
                Objects.equals(path, jsView.path) &&
                getNodeType().equals(jsView.getNodeType()) &&
                getTemplateType().equals(jsView.getTemplateType()) &&
                isTemplate() == jsView.isTemplate();
    }

    @Override
    public int hashCode() {
        return Objects.hash(getRegistryKey(), getKey(), getModule(), path, getNodeType(), getTemplateType(), isTemplate());
    }

    @Override
    public int compareTo(@Nonnull View otherView) {
        if (otherView instanceof JSView) {
            int priorityComparison = Integer.compare(((JSView) otherView).getPriority(), getPriority());
            if (priorityComparison != 0) {
                return priorityComparison;
            }
        }
        if (getModule() == null) {
            return otherView.getModule() != null ? 1 : getKey().compareTo(otherView.getKey());
        }
        if (otherView.getModule() == null) {
            return -1;
        }
        int moduleComparison = getModule().getName().compareTo(otherView.getModule().getName());
        if (moduleComparison != 0) {
            return moduleComparison;
        }
        return getKey().compareTo(otherView.getKey());
    }

}
