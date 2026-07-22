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
package org.jahia.modules.javascript.modules.engine.actions;

import org.apache.commons.io.IOUtils;
import org.graalvm.polyglot.Value;
import org.jahia.bin.Action;
import org.jahia.bin.ActionResult;
import org.jahia.modules.javascript.modules.engine.jsengine.GraalVMEngine;
import org.jahia.services.content.JCRSessionWrapper;
import org.jahia.services.render.RenderContext;
import org.jahia.services.render.Resource;
import org.jahia.services.render.URLResolver;
import org.json.JSONArray;
import org.json.JSONObject;
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
 * Single HTTP endpoint dispatching to all JavaScript-declared actions (registry type {@code action},
 * produced by {@code .action.ts} files).
 *
 * <p>Exposed as the platform action {@code jsAction}: client stubs POST a devalue-serialized arguments
 * array to {@code <pageUrl>.jsAction.do?name=<module>/<export>} and receive an envelope
 * {@code {"data": "<devalue>"}} or {@code {"error": "...", "issues": [...]?}}. The envelope always
 * travels on HTTP 200 because the render servlet only writes JSON bodies for 2xx action results.
 *
 * <p>The {@code X-JS-Action} header is required: HTML forms cannot set custom headers and cross-origin
 * scripts would need a CORS preflight that Jahia does not grant, so the endpoint is not exploitable as
 * a classic CSRF target even though its URL pattern is whitelisted in Jahia's CSRF guard (the engine
 * ships that whitelist entry).
 *
 * <p>The dispatcher itself allows guest calls (islands run on public pages); the executed function can
 * inspect the current user through its own means, and modules needing protection can check and throw.
 */
@Component(service = Action.class, immediate = true)
public class GenericActionEndpoint extends Action {

    public static final String ACTION_NAME = "jsAction";
    public static final String REGISTRY_TYPE = "action";
    public static final String REQUIRED_HEADER = "X-JS-Action";

    private static final Logger logger = LoggerFactory.getLogger(GenericActionEndpoint.class);

    private GraalVMEngine graalVMEngine;

    @Reference(cardinality = ReferenceCardinality.MANDATORY)
    public void setGraalVMEngine(GraalVMEngine graalVMEngine) {
        this.graalVMEngine = graalVMEngine;
    }

    @Activate
    public void activate() {
        setName(ACTION_NAME);
        setRequireAuthenticatedUser(false);
        setRequiredMethods("POST");
    }

    @Override
    public ActionResult doExecute(HttpServletRequest request, RenderContext renderContext, Resource resource,
            JCRSessionWrapper session, Map<String, List<String>> parameters, URLResolver urlResolver)
            throws Exception {
        if (request.getHeader(REQUIRED_HEADER) == null) {
            return error("Missing " + REQUIRED_HEADER + " header");
        }
        String name = getParameter(parameters, "name");
        if (name == null) {
            return error("Missing action name");
        }
        String body = IOUtils.toString(request.getReader());

        return graalVMEngine.doWithContext(contextProvider -> {
            Map<String, Object> entry = contextProvider.getRegistry().get(REGISTRY_TYPE, name);
            if (entry == null || entry.get("execute") == null) {
                return error("Unknown action: " + name);
            }
            JSPromise.Outcome outcome;
            try {
                outcome = JSPromise.settle(Value.asValue(entry.get("execute")).execute(body));
            } catch (Exception e) {
                logger.error("JS action '{}' failed to execute", name, e);
                return error("Action execution failed");
            }
            if (!outcome.isSettled()) {
                logger.error("JS action '{}' returned a promise that did not settle; only microtask-based " +
                        "asynchronicity is supported on the server (no timers or async I/O)", name);
                return error("Action did not settle synchronously");
            }
            if (outcome.isRejected()) {
                return error(readMessage(outcome.getError()), readIssues(outcome.getError()));
            }
            Value data = outcome.getValue();
            if (data == null || data.isNull() || !data.isString()) {
                logger.error("JS action '{}' adapter did not return a serialized string", name);
                return error("Action returned an unexpected result");
            }
            return new ActionResult(HttpServletResponse.SC_OK, null, new JSONObject().put("data", data.asString()));
        });
    }

    private static String readMessage(Value errorValue) {
        if (errorValue != null && errorValue.hasMembers() && errorValue.hasMember("message")) {
            Value message = errorValue.getMember("message");
            if (message != null && message.isString()) {
                return message.asString();
            }
        }
        return "Action failed";
    }

    /** The JS adapter pre-stringifies validation issues as a JSON array. */
    private static JSONArray readIssues(Value errorValue) {
        if (errorValue != null && errorValue.hasMembers() && errorValue.hasMember("issues")) {
            Value issues = errorValue.getMember("issues");
            if (issues != null && issues.isString()) {
                try {
                    return new JSONArray(issues.asString());
                } catch (Exception e) {
                    logger.warn("Ignoring malformed validation issues payload", e);
                }
            }
        }
        return null;
    }

    private static ActionResult error(String message) {
        return error(message, null);
    }

    private static ActionResult error(String message, JSONArray issues) {
        JSONObject json = new JSONObject().put("error", message);
        if (issues != null) {
            json.put("issues", issues);
        }
        return new ActionResult(HttpServletResponse.SC_OK, null, json);
    }
}
