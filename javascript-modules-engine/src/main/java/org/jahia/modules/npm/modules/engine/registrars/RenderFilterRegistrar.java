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
package org.jahia.modules.npm.modules.engine.registrars;

import org.graalvm.polyglot.Value;
import org.jahia.modules.npm.modules.engine.jsengine.ContextProvider;
import org.jahia.modules.npm.modules.engine.jsengine.GraalVMEngine;
import org.jahia.services.render.RenderContext;
import org.jahia.services.render.RenderService;
import org.jahia.services.render.Resource;
import org.jahia.services.render.filter.AbstractFilter;
import org.jahia.services.render.filter.RenderChain;
import org.jahia.services.render.filter.RenderFilter;
import org.osgi.framework.Bundle;
import org.osgi.framework.BundleContext;
import org.osgi.framework.ServiceRegistration;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import org.osgi.service.component.annotations.ReferenceCardinality;

import java.util.*;

@Component(service = Registrar.class, immediate = true)
public class RenderFilterRegistrar implements Registrar {

    private RenderService renderService;
    private BundleContext bundleContext;

    private GraalVMEngine graalVMEngine;

    private final Map<Bundle, Collection<ServiceRegistration<RenderFilter>>> registrations = new HashMap<>();

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
    public void register(Bundle bundle) {
        List<Map<String, Object>> renderFilters = graalVMEngine.doWithContext(contextProvider -> {
            Map<String, Object> filter = new HashMap<>();
            filter.put("type", "render-filter");
            filter.put("bundleKey", bundle.getSymbolicName());
            return contextProvider.getRegistry().find(filter);
        });

        Set<ServiceRegistration<RenderFilter>> set = new HashSet<>();
        registrations.put(bundle, set);
        for (Map<String, Object> renderFilter : renderFilters) {
            RenderFilterBridge renderFilterImpl = new RenderFilterBridge(renderFilter, graalVMEngine);
            renderFilterImpl.setRenderService(renderService);
            renderFilterImpl.setPriority(0);

            set.add(bundleContext.registerService(RenderFilter.class, renderFilterImpl, new Hashtable<>()));
        }
    }

    @Override
    public void unregister(Bundle bundle) {
        Collection<ServiceRegistration<RenderFilter>> set = registrations.remove(bundle);
        if (set != null) {
            for (ServiceRegistration<RenderFilter> registration : set) {
                registration.unregister();
            }
        }
    }

    public static class RenderFilterBridge extends AbstractFilter {
        private final GraalVMEngine engine;
        private final String key;

        public RenderFilterBridge(Map<String, Object> value, GraalVMEngine engine) {
            this.engine = engine;
            this.key = (String) value.get("key");
            if (value.containsKey("priority")) {
                setPriority(Integer.parseInt(value.get("priority").toString()));
            }
            if (value.containsKey("description")) {
                setDescription(value.get("description").toString());
            }
            if (value.containsKey("applyOnConfigurations")) {
                this.setApplyOnConfigurations(value.get("applyOnConfigurations").toString());
            }
            if (value.containsKey("applyOnModes")) {
                this.setApplyOnModes(value.get("applyOnModes").toString());
            }
            if (value.containsKey("applyOnNodeTypes")) {
                this.setApplyOnNodeTypes(value.get("applyOnNodeTypes").toString());
            }
            if (value.containsKey("applyOnTemplates")) {
                this.setApplyOnTemplates(value.get("applyOnTemplates").toString());
            }
            if (value.containsKey("applyOnTemplateTypes")) {
                this.setApplyOnTemplateTypes(value.get("applyOnTemplateTypes").toString());
            }
        }

        @Override
        public String execute(String s, RenderContext renderContext, Resource resource, RenderChain renderChain) throws Exception {
            return engine.doWithContext(contextProvider -> {
                return Value.asValue(getJsFilter(contextProvider).get("execute")).execute(s, renderContext, resource, renderChain).asString();
            });
        }

        @Override
        public String prepare(RenderContext renderContext, Resource resource, RenderChain renderChain) throws Exception {
            return engine.doWithContext(contextProvider -> {
                return Value.asValue(getJsFilter(contextProvider).get("prepare")).execute(renderContext, resource, renderChain).asString();
            });
        }

        private Map<String, Object> getJsFilter(ContextProvider contextProvider) {
            return contextProvider.getRegistry().get("render-filter", key);
        }
    }
}
