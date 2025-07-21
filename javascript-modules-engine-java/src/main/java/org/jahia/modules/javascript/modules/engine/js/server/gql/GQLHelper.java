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
package org.jahia.modules.javascript.modules.engine.js.server.gql;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.graalvm.polyglot.Value;
import org.jahia.modules.javascript.modules.engine.js.injector.OSGiService;
import org.jahia.modules.javascript.modules.engine.js.server.gql.HttpServletRequestMock;
import org.jahia.modules.javascript.modules.engine.js.server.gql.HttpServletResponseMock;
import org.jahia.modules.javascript.modules.engine.js.server.gql.ServletOutputStreamMock;
import org.jahia.modules.javascript.modules.engine.jsengine.ContextProvider;
import org.jahia.modules.javascript.modules.engine.jsengine.Promise;
import org.jahia.services.render.RenderContext;
import org.jahia.services.securityfilter.PermissionService;
import org.jahia.services.securityfilter.ScopeDefinition;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.inject.Inject;
import javax.jcr.RepositoryException;
import javax.servlet.*;
import javax.servlet.http.*;
import java.io.IOException;
import java.util.*;

/**
 * Helper class to execute GraphQL queries. It provides both synchronous and asynchronous methods to execute queries.
 */
public class GQLHelper {

    private static final Logger logger = LoggerFactory.getLogger(GQLHelper.class);

    private final ContextProvider context;
    private HttpServlet servlet;
    private PermissionService permissionService;

    public GQLHelper(ContextProvider context) {
        this.context = context;
    }

    /**
     * Execute an asynchronous GraphQL query using the specified parameters and return a Promise that will be resolved with the result
     *
     * @param parameters the parameters can contain the following keys:
     *                   <ul>
     *                   <li> query (string) : the GraphQL query to be executed </li>
     *                   <li> operationName (string) : the GraphQL operation name </li>
     *                   <li> variables: the variables as a JSON string or a Map&lt;String, Object&gt; </li>
     *                   <li> renderContext (RenderContext) : the render context
     *                   if the renderContext is null, a request will be created with the parameters that were passed,
     *                   otherwise the request from the renderContext will be used. </li>
     *                   </ul>
     * @return a Promise that will be resolved with the result of the query as a JSON structure or with an error message
     * if there was an error executing the query
     */
    public Promise executeQuery(Map parameters) {
        return (onResolve, onReject) -> {
            // convert JSON string to Map
            try {
                Value js = executeQuerySync(parameters);
                onResolve.execute(js);
            } catch (Exception e) {
                onReject.execute(e.getMessage());
            }
        };
    }

    /**
     * Execute a synchronous GraphQL query using the specified parameters and return the result
     *
     * @param parameters the parameters can contain the following keys:
     *                   <ul>
     *                   <li> query (string) : the GraphQL query to be executed </li>
     *                   <li> operationName (string) : the GraphQL operation name </li>
     *                   <li> variables: the variables as a JSON string or a Map&lt;String, Object&gt; </li>
     *                   <li> renderContext (RenderContext) : the render context
     *                   if the renderContext is null, a request will be created with the parameters that were passed,
     *                   otherwise the request from the renderContext will be used. </li>
     *                   </ul>
     * @return the result of the query as a JSON structure
     * @throws ServletException
     * @throws IOException
     */
    public Value executeQuerySync(Map parameters) throws ServletException, IOException, RepositoryException {
        ObjectMapper mapper = new ObjectMapper();
        Map<String, String> params = new HashMap<>();
        params.put("query", (String) parameters.get("query"));
        params.put("operationName", (String) parameters.get("operationName"));
        if (parameters.containsKey("variables")) {
            if (parameters.get("variables") instanceof String) {
                params.put("variables", (String) parameters.get("variables"));
            } else {
                params.put("variables", mapper.writeValueAsString(parameters.get("variables")));
            }
        }

        Collection<ScopeDefinition> currentScopes = permissionService.getCurrentScopes();
        if (currentScopes == null || currentScopes.stream().noneMatch(scope -> "graphql".equals(scope.getScopeName()))) {
            // Inject graphql scope if missing
            Optional<ScopeDefinition> graphqlScope = permissionService.getAvailableScopes().stream().filter(scope -> scope.getScopeName().equals("graphql")).findFirst();
            if (graphqlScope.isPresent()) {
                Set<ScopeDefinition> newScopes = new HashSet<>();
                if (currentScopes != null) {
                    newScopes.addAll(currentScopes);
                }
                newScopes.add(graphqlScope.get());
                permissionService.setCurrentScopes(newScopes);
            } else {
                // Warn about missing scope
                logger.warn("Unable to find graphql scope in available scopes");
            }
        }

        RenderContext renderContext = (RenderContext) parameters.get("renderContext");
        HttpServletRequest req = renderContext == null ? new HttpServletRequestMock(params) : new HttpServletRequestWrapper(renderContext.getRequest()) {
            public String getParameter(String name) {
                if (params.containsKey(name)) {
                    return params.get(name);
                }
                return super.getParameter(name);
            }
        };
        HttpServletResponseMock responseMock = new HttpServletResponseMock(req.getCharacterEncoding());
        servlet.service(req, responseMock);
        // TODO: use JSON.parse
        return context.getContext().eval("js", "(" + ((ServletOutputStreamMock) responseMock.getOutputStream()).getContent() + ")");
    }

    @Inject
    @OSGiService(service = PermissionService.class)
    public void setPermissionService(PermissionService permissionService) {
        this.permissionService = permissionService;
    }

    @Inject
    @OSGiService(service = HttpServlet.class,
            filter = "(component.name=graphql.kickstart.servlet.OsgiGraphQLHttpServlet)")
    public void setServlet(HttpServlet servlet) {
        this.servlet = servlet;
    }

}
