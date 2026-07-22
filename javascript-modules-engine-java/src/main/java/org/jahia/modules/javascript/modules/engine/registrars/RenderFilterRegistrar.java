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

import org.graalvm.polyglot.Value;
import org.jahia.modules.javascript.modules.engine.jsengine.ContextProvider;
import org.jahia.modules.javascript.modules.engine.jsengine.GraalVMEngine;
import org.jahia.modules.javascript.modules.engine.jsengine.JSPromise;
import org.jahia.services.render.RenderContext;
import org.jahia.services.render.RenderService;
import org.jahia.services.render.Resource;
import org.jahia.services.render.filter.AbstractFilter;
import org.jahia.services.render.filter.RenderChain;
import org.jahia.services.render.filter.RenderFilter;
import org.osgi.framework.BundleContext;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import org.osgi.service.component.annotations.ReferenceCardinality;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;

/**
 * Exposes JavaScript registry entries of type {@code render-filter} as {@link RenderFilter} OSGi
 * services, participating in Jahia's render chain like Java {@link AbstractFilter} implementations.
 */
@Component(service = Registrar.class, immediate = true)
public class RenderFilterRegistrar extends AbstractServiceRegistrar<RenderFilter> {

    public static final String REGISTRY_TYPE = "render-filter";

    private RenderService renderService;

    public RenderFilterRegistrar() {
        super(RenderFilter.class, REGISTRY_TYPE);
    }

    @Reference
    public void setRenderService(RenderService renderService) {
        this.renderService = renderService;
    }

    @Reference(cardinality = ReferenceCardinality.MANDATORY)
    public void setGraalVMEngine(GraalVMEngine graalVMEngine) {
        this.graalVMEngine = graalVMEngine;
    }

    @Activate
    public void activate(BundleContext bundleContext) {
        this.bundleContext = bundleContext;
    }

    @Override
    protected RenderFilter createBridge(Map<String, Object> registryEntry) {
        RenderFilterBridge bridge = new RenderFilterBridge(registryEntry, graalVMEngine);
        bridge.setRenderService(renderService);
        return bridge;
    }

    public static class RenderFilterBridge extends AbstractFilter {

        private static final Logger logger = LoggerFactory.getLogger(RenderFilterBridge.class);

        private final GraalVMEngine engine;
        private final String key;

        public RenderFilterBridge(Map<String, Object> registryEntry, GraalVMEngine engine) {
            this.engine = engine;
            this.key = (String) registryEntry.get("key");
            if (registryEntry.containsKey("priority")) {
                setPriority(Float.parseFloat(registryEntry.get("priority").toString()));
            } else {
                setPriority(0);
            }
            if (registryEntry.containsKey("description")) {
                setDescription(registryEntry.get("description").toString());
            }
            if (registryEntry.containsKey("applyOnConfigurations")) {
                setApplyOnConfigurations(registryEntry.get("applyOnConfigurations").toString());
            }
            if (registryEntry.containsKey("applyOnModes")) {
                setApplyOnModes(registryEntry.get("applyOnModes").toString());
            }
            if (registryEntry.containsKey("applyOnNodeTypes")) {
                setApplyOnNodeTypes(registryEntry.get("applyOnNodeTypes").toString());
            }
            if (registryEntry.containsKey("applyOnTemplates")) {
                setApplyOnTemplates(registryEntry.get("applyOnTemplates").toString());
            }
            if (registryEntry.containsKey("applyOnTemplateTypes")) {
                setApplyOnTemplateTypes(registryEntry.get("applyOnTemplateTypes").toString());
            }
        }

        @Override
        public String execute(String previousOut, RenderContext renderContext, Resource resource, RenderChain renderChain) throws Exception {
            return engine.doWithContext(contextProvider -> {
                Map<String, Object> jsFilter = getJsFilter(contextProvider);
                if (jsFilter == null) {
                    logger.warn("JS render filter '{}' is no longer available in the registry, skipping execute", key);
                    return previousOut;
                }
                if (jsFilter.get("execute") == null) {
                    // both callbacks are optional: a prepare-only filter is a no-op here
                    return previousOut;
                }
                Value result = JSPromise.settleOrThrow(
                        Value.asValue(jsFilter.get("execute")).execute(previousOut, renderContext, resource, renderChain),
                        "JS render filter '" + key + "' execute");
                return result == null || result.isNull() ? previousOut : result.asString();
            });
        }

        @Override
        public String prepare(RenderContext renderContext, Resource resource, RenderChain renderChain) throws Exception {
            return engine.doWithContext(contextProvider -> {
                Map<String, Object> jsFilter = getJsFilter(contextProvider);
                if (jsFilter == null) {
                    logger.warn("JS render filter '{}' is no longer available in the registry, skipping prepare", key);
                    return null;
                }
                if (jsFilter.get("prepare") == null) {
                    // both callbacks are optional: an execute-only filter is a no-op here
                    return null;
                }
                Value result = JSPromise.settleOrThrow(
                        Value.asValue(jsFilter.get("prepare")).execute(renderContext, resource, renderChain),
                        "JS render filter '" + key + "' prepare");
                return result == null || result.isNull() ? null : result.asString();
            });
        }

        private Map<String, Object> getJsFilter(ContextProvider contextProvider) {
            return contextProvider.getRegistry().get(REGISTRY_TYPE, key);
        }
    }
}
