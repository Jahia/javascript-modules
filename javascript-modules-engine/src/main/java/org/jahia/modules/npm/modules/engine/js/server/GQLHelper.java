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

import com.fasterxml.jackson.databind.ObjectMapper;
import org.graalvm.polyglot.Value;
import org.jahia.modules.npm.modules.engine.js.injector.OSGiService;
import org.jahia.modules.npm.modules.engine.jsengine.ContextProvider;
import org.jahia.modules.npm.modules.engine.jsengine.Promise;
import org.jahia.services.render.RenderContext;
import org.jahia.services.securityfilter.PermissionService;
import org.jahia.services.securityfilter.ScopeDefinition;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.inject.Inject;
import javax.jcr.RepositoryException;
import javax.servlet.*;
import javax.servlet.http.*;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.PrintWriter;
import java.io.UnsupportedEncodingException;
import java.security.Principal;
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
        HttpServletResponseMock responseMock = new HttpServletResponseMock();
        servlet.service(req, responseMock);
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

    private static class HttpServletRequestMock implements HttpServletRequest {
        private final Map<String, String> params;

        public HttpServletRequestMock(Map<String, String> params) {
            this.params = params;
        }

        @Override
        public String getAuthType() {
            return null;
        }

        @Override
        public Cookie[] getCookies() {
            return new Cookie[0];
        }

        @Override
        public long getDateHeader(String name) {
            return 0;
        }

        @Override
        public String getHeader(String name) {
            return null;
        }

        @Override
        public Enumeration<String> getHeaders(String name) {
            return null;
        }

        @Override
        public Enumeration<String> getHeaderNames() {
            return null;
        }

        @Override
        public int getIntHeader(String name) {
            return 0;
        }

        @Override
        public String getMethod() {
            return "GET";
        }

        @Override
        public String getPathInfo() {
            return "/";
        }

        @Override
        public String getPathTranslated() {
            return null;
        }

        @Override
        public String getContextPath() {
            return null;
        }

        @Override
        public String getQueryString() {
            return null;
        }

        @Override
        public String getRemoteUser() {
            return null;
        }

        @Override
        public boolean isUserInRole(String role) {
            return false;
        }

        @Override
        public Principal getUserPrincipal() {
            return null;
        }

        @Override
        public String getRequestedSessionId() {
            return null;
        }

        @Override
        public String getRequestURI() {
            return null;
        }

        @Override
        public StringBuffer getRequestURL() {
            return null;
        }

        @Override
        public String getServletPath() {
            return null;
        }

        @Override
        public HttpSession getSession(boolean create) {
            return null;
        }

        @Override
        public HttpSession getSession() {
            return null;
        }

        @Override
        public String changeSessionId() {
            return null;
        }

        @Override
        public boolean isRequestedSessionIdValid() {
            return true;
        }

        @Override
        public boolean isRequestedSessionIdFromCookie() {
            return false;
        }

        @Override
        public boolean isRequestedSessionIdFromURL() {
            return false;
        }

        @Override
        public boolean isRequestedSessionIdFromUrl() {
            return false;
        }

        @Override
        public boolean authenticate(HttpServletResponse httpServletResponse) throws IOException, ServletException {
            return true;
        }

        @Override
        public void login(String s, String s1) throws ServletException {

        }

        @Override
        public void logout() throws ServletException {

        }

        @Override
        public Collection<Part> getParts() throws IOException, ServletException {
            return Collections.emptyList();
        }

        @Override
        public Part getPart(String s) throws IOException, ServletException {
            return null;
        }

        @Override
        public <T extends HttpUpgradeHandler> T upgrade(Class<T> aClass) throws IOException, ServletException {
            return null;
        }

        @Override
        public Object getAttribute(String name) {
            return null;
        }

        @Override
        public Enumeration<String> getAttributeNames() {
            return null;
        }

        @Override
        public String getCharacterEncoding() {
            return null;
        }

        @Override
        public void setCharacterEncoding(String env) throws UnsupportedEncodingException {

        }

        @Override
        public int getContentLength() {
            return 0;
        }

        @Override
        public long getContentLengthLong() {
            return 0;
        }

        @Override
        public String getContentType() {
            return null;
        }

        @Override
        public ServletInputStream getInputStream() throws IOException {
            return null;
        }

        @Override
        public String getParameter(String name) {
            return params.get(name);
        }

        @Override
        public Enumeration<String> getParameterNames() {
            return null;
        }

        @Override
        public String[] getParameterValues(String name) {
            return new String[0];
        }

        @Override
        public Map<String, String[]> getParameterMap() {
            return null;
        }

        @Override
        public String getProtocol() {
            return null;
        }

        @Override
        public String getScheme() {
            return null;
        }

        @Override
        public String getServerName() {
            return null;
        }

        @Override
        public int getServerPort() {
            return 0;
        }

        @Override
        public BufferedReader getReader() throws IOException {
            return null;
        }

        @Override
        public String getRemoteAddr() {
            return null;
        }

        @Override
        public String getRemoteHost() {
            return null;
        }

        @Override
        public void setAttribute(String name, Object o) {

        }

        @Override
        public void removeAttribute(String name) {

        }

        @Override
        public Locale getLocale() {
            return null;
        }

        @Override
        public Enumeration<Locale> getLocales() {
            return null;
        }

        @Override
        public boolean isSecure() {
            return false;
        }

        @Override
        public RequestDispatcher getRequestDispatcher(String path) {
            return null;
        }

        @Override
        public String getRealPath(String path) {
            return null;
        }

        @Override
        public int getRemotePort() {
            return 0;
        }

        @Override
        public String getLocalName() {
            return null;
        }

        @Override
        public String getLocalAddr() {
            return null;
        }

        @Override
        public int getLocalPort() {
            return 0;
        }

        @Override
        public ServletContext getServletContext() {
            return null;
        }

        @Override
        public AsyncContext startAsync() throws IllegalStateException {
            return null;
        }

        @Override
        public AsyncContext startAsync(ServletRequest servletRequest, ServletResponse servletResponse) throws IllegalStateException {
            return null;
        }

        @Override
        public boolean isAsyncStarted() {
            return false;
        }

        public boolean isAsyncSupported() {
            return false;
        }

        @Override
        public AsyncContext getAsyncContext() {
            return null;
        }

        @Override
        public DispatcherType getDispatcherType() {
            return null;
        }
    }

    private static class ServletOutputStreamMock extends ServletOutputStream {

        private final StringBuilder buffer = new StringBuilder();

        @Override
        public void write(int b) throws IOException {
            buffer.append((char) b);
        }

        @Override
        public boolean isReady() {
            return true;
        }

        @Override
        public void setWriteListener(WriteListener writeListener) {
        }

        public String getContent() {
            return buffer.toString();
        }
    }

    private static class HttpServletResponseMock implements HttpServletResponse {
        private final ServletOutputStream out;

        public HttpServletResponseMock() {
            this.out = new ServletOutputStreamMock();
        }

        @Override
        public void addCookie(Cookie cookie) {

        }

        @Override
        public boolean containsHeader(String name) {
            return false;
        }

        @Override
        public String encodeURL(String url) {
            return url;
        }

        @Override
        public String encodeRedirectURL(String url) {
            return null;
        }

        @Override
        public String encodeUrl(String url) {
            return null;
        }

        @Override
        public String encodeRedirectUrl(String url) {
            return null;
        }

        @Override
        public void sendError(int sc, String msg) throws IOException {

        }

        @Override
        public void sendError(int sc) throws IOException {

        }

        @Override
        public void sendRedirect(String location) throws IOException {

        }

        @Override
        public void setDateHeader(String name, long date) {

        }

        @Override
        public void addDateHeader(String name, long date) {

        }

        @Override
        public void setHeader(String name, String value) {

        }

        @Override
        public void addHeader(String name, String value) {

        }

        @Override
        public void setIntHeader(String name, int value) {

        }

        @Override
        public void addIntHeader(String name, int value) {

        }

        @Override
        public void setStatus(int sc) {

        }

        @Override
        public void setStatus(int sc, String sm) {

        }

        @Override
        public int getStatus() {
            return 0;
        }

        @Override
        public String getHeader(String s) {
            return null;
        }

        @Override
        public Collection<String> getHeaders(String s) {
            return Collections.emptyList();
        }

        @Override
        public Collection<String> getHeaderNames() {
            return Collections.emptyList();
        }

        @Override
        public String getCharacterEncoding() {
            return null;
        }

        @Override
        public void setCharacterEncoding(String charset) {

        }

        @Override
        public String getContentType() {
            return null;
        }

        @Override
        public void setContentType(String type) {

        }

        @Override
        public ServletOutputStream getOutputStream() throws IOException {
            return out;
        }

        @Override
        public PrintWriter getWriter() throws IOException {
            return null;
        }

        @Override
        public void setContentLength(int len) {

        }

        @Override
        public void setContentLengthLong(long l) {

        }

        @Override
        public int getBufferSize() {
            return 0;
        }

        @Override
        public void setBufferSize(int size) {

        }

        @Override
        public void flushBuffer() throws IOException {

        }

        @Override
        public void resetBuffer() {

        }

        @Override
        public boolean isCommitted() {
            return false;
        }

        @Override
        public void reset() {

        }

        @Override
        public Locale getLocale() {
            return null;
        }

        @Override
        public void setLocale(Locale loc) {

        }
    }

}
