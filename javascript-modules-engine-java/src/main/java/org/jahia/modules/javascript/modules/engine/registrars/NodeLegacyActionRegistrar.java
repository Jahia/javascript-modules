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
import org.jahia.bin.Action;
import org.jahia.bin.ActionResult;
import org.jahia.modules.javascript.modules.engine.jsengine.ContextProvider;
import org.jahia.modules.javascript.modules.engine.jsengine.GraalVMEngine;
import org.jahia.modules.javascript.modules.engine.jsengine.JSPromise;
import org.jahia.services.content.JCRSessionWrapper;
import org.jahia.services.render.RenderContext;
import org.jahia.services.render.Resource;
import org.jahia.services.render.URLResolver;
import org.jahia.services.templates.JahiaTemplateManagerService;
import org.json.JSONObject;
import org.osgi.framework.Bundle;
import org.osgi.framework.BundleContext;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import org.osgi.service.component.annotations.ReferenceCardinality;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.util.List;
import java.util.Map;

/**
 * Exposes JavaScript registry entries of type {@code node-legacy-action} as {@link Action} OSGi services, consumed by
 * Jahia core and invoked through {@code <nodeUrl>.<actionName>.do} URLs.
 */
@Component(service = Registrar.class, immediate = true)
public class NodeLegacyActionRegistrar extends AbstractServiceRegistrar<Action> {

    public static final String REGISTRY_TYPE = "node-legacy-action";

    private static final Logger logger = LoggerFactory.getLogger(NodeLegacyActionRegistrar.class);

    private JahiaTemplateManagerService templateManagerService;

    public NodeLegacyActionRegistrar() {
        super(Action.class, REGISTRY_TYPE);
    }

    @Reference(cardinality = ReferenceCardinality.MANDATORY)
    public void setGraalVMEngine(GraalVMEngine graalVMEngine) {
        this.graalVMEngine = graalVMEngine;
    }

    @Reference
    public void setTemplateManagerService(JahiaTemplateManagerService templateManagerService) {
        this.templateManagerService = templateManagerService;
    }

    @Activate
    public void activate(BundleContext bundleContext) {
        this.bundleContext = bundleContext;
    }

    @Override
    protected void beforeRegister(Bundle bundle, Map<String, Object> registryEntry) {
        Object key = registryEntry.get("key");
        if (key != null
                && templateManagerService.getTemplatePackageRegistry().getActions().containsKey(key.toString())) {
            logger.warn("An action named '{}' is already registered on this platform; the one declared by " +
                    "bundle {} will take precedence (last registration wins). " +
                    "Consider prefixing action names with the module name.", key, bundle.getSymbolicName());
        }
    }

    @Override
    protected Action createBridge(Map<String, Object> registryEntry) {
        return new ActionBridge(registryEntry, graalVMEngine);
    }

    public static class ActionBridge extends Action {

        private final GraalVMEngine engine;

        public ActionBridge(Map<String, Object> registryEntry, GraalVMEngine engine) {
            this.engine = engine;
            setName((String) registryEntry.get("key"));
            if (registryEntry.containsKey("requiredMethods")) {
                setRequiredMethods(registryEntry.get("requiredMethods").toString());
            }
            if (registryEntry.containsKey("requireAuthenticatedUser")) {
                setRequireAuthenticatedUser((Boolean) registryEntry.get("requireAuthenticatedUser"));
            }
            if (registryEntry.containsKey("requiredPermission")) {
                setRequiredPermission(registryEntry.get("requiredPermission").toString());
            }
            if (registryEntry.containsKey("requiredWorkspace")) {
                setRequiredWorkspace(registryEntry.get("requiredWorkspace").toString());
            }
        }

        @Override
        public ActionResult doExecute(HttpServletRequest request, RenderContext renderContext, Resource resource,
                JCRSessionWrapper session, Map<String, List<String>> parameters, URLResolver urlResolver)
                throws Exception {
            return engine.doWithContext(contextProvider -> {
                Map<String, Object> entry = getJsAction(contextProvider);
                if (entry == null || entry.get("doExecute") == null) {
                    logger.warn("JS action '{}' is no longer available in the registry", getName());
                    return ActionResult.SERVICE_UNAVAILABLE;
                }
                Value result = JSPromise.settleOrThrow(
                        Value.asValue(entry.get("doExecute"))
                                .execute(request, renderContext, resource, session, parameters, urlResolver),
                        "JS legacy node action '" + getName() + "'");
                return convertResult(result);
            });
        }

        private Map<String, Object> getJsAction(ContextProvider contextProvider) {
            return contextProvider.getRegistry().get(REGISTRY_TYPE, getName());
        }

        /**
         * Converts the JS adapter result ({@code {statusCode?, json?: string, redirect?, absoluteRedirect?}},
         * with {@code json} pre-stringified on the JS side to avoid polyglot deep-conversion pitfalls) into an
         * {@link ActionResult}.
         */
        static ActionResult convertResult(Value result) {
            if (result == null || result.isNull()) {
                return new ActionResult(HttpServletResponse.SC_OK);
            }
            int statusCode = result.hasMember("statusCode") && !result.getMember("statusCode").isNull()
                    ? result.getMember("statusCode").asInt()
                    : HttpServletResponse.SC_OK;
            String redirect = result.hasMember("redirect") && !result.getMember("redirect").isNull()
                    ? result.getMember("redirect").asString()
                    : null;
            boolean absoluteRedirect = result.hasMember("absoluteRedirect")
                    && !result.getMember("absoluteRedirect").isNull()
                    && result.getMember("absoluteRedirect").asBoolean();
            JSONObject json = null;
            if (result.hasMember("json") && !result.getMember("json").isNull()) {
                json = new JSONObject(result.getMember("json").asString());
            }
            return new ActionResult(statusCode, redirect, absoluteRedirect, json);
        }
    }
}
