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

import org.graalvm.polyglot.Value;
import org.graalvm.polyglot.proxy.ProxyObject;
import org.jahia.modules.javascript.modules.engine.jsengine.GraalVMEngine;
import java.util.ArrayList;
import java.util.List;

import org.jahia.modules.javascript.modules.engine.js.server.CollectedCacheDependencies;
import org.jahia.services.render.RenderContext;
import org.jahia.services.render.RenderException;
import org.jahia.services.render.Resource;
import org.jahia.services.render.View;
import org.jahia.services.render.scripting.Script;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import pl.touk.throwing.ThrowingFunction;

import java.util.Map;

public class JSScript implements Script {
    private static final Logger logger = LoggerFactory.getLogger(JSScript.class);

    private final JSView jsView;
    private final GraalVMEngine graalVMEngine;

    public JSScript(JSView jsView, GraalVMEngine graalVMEngine) {
        this.jsView = jsView;
        this.graalVMEngine = graalVMEngine;
    }

    @Override
    public String execute(Resource resource, RenderContext renderContext) throws RenderException {
        String output = graalVMEngine.doWithContext(ThrowingFunction.unchecked(contextProvider -> {
            Map<String, Object> viewValues = jsView.getRegistryInstance(contextProvider);

            if (!viewValues.containsKey("viewRenderer")) {
                throw new RenderException(String.format("Missing view rendered for view: %s", jsView.getRegistryKey()));
            }

            String viewRendererStr = viewValues.get("viewRenderer").toString();
            Map<String, Object> viewRenderer = contextProvider.getRegistry().get("viewRenderer", viewRendererStr);
            if (viewRenderer == null) {
                throw new RenderException(String.format("Unknown view renderer: %s for view: %s", viewRendererStr, jsView.getRegistryKey()));
            }

            if (logger.isDebugEnabled()) {
                logger.debug("Calling JS Engine for view {}", resource.getTemplate());
            }

            viewValues.put("bundle", Value.asValue(jsView.getModule().getBundle()));
            Object executionResult = Value.asValue(viewRenderer.get("render")).execute(resource, renderContext, ProxyObject.fromMap(viewValues));
            return readRenderResult(Value.asValue(executionResult), resource);
        }));

        if (jsView.isTemplate()) {
            // Jahia core TemplateNodeFilter is using this attribute to store the template
            // in request for sub fragment cache entries
            // We need to clean it after template output, in order for cache keys to be
            // generated correctly for the main resource
            // (part of code necessary to make template inheritance hierarchy and relatives
            // areas working correctly)
            renderContext.getRequest().setAttribute("previousTemplate", null);
        }

        return output;
    }

    /**
     * Reads what a view renderer returned: the markup, and the cache dependencies
     * the view autocollected while it rendered.
     *
     * @param result   what the renderer returned
     * @param resource the resource that was rendered
     * @return the markup
     */
    private String readRenderResult(Value result, Resource resource) {
        Value dependencies = result.getMember("autocollectedDependencies");
        int length = (int) dependencies.getArraySize();
        List<String> collected = new ArrayList<>(length);
        for (int i = 0; i < length; i++) {
            collected.add(dependencies.getArrayElement(i).asString());
        }
        CollectedCacheDependencies.register(resource, collected);

        return result.getMember("html").asString();
    }

    @Override
    public View getView() {
        return jsView;
    }
}
