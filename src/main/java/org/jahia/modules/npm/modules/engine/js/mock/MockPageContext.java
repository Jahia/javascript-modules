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
package org.jahia.modules.npm.modules.engine.js.mock;

import org.jahia.services.render.RenderContext;

import javax.el.ELContext;
import javax.servlet.*;
import javax.servlet.http.HttpSession;
import javax.servlet.jsp.JspWriter;
import javax.servlet.jsp.PageContext;
import javax.servlet.jsp.el.ExpressionEvaluator;
import javax.servlet.jsp.el.VariableResolver;
import java.io.IOException;
import java.io.StringWriter;
import java.util.Collections;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.Map;

public class MockPageContext extends PageContext {
    private final Map<String, Object> pageAttrs = Collections.synchronizedMap(new HashMap<>());
    private final Map<String, Object> appAttr = Collections.synchronizedMap(new HashMap<>());
    private final MockJspWriter writer;
    private final RenderContext renderContext;

    public MockPageContext(RenderContext renderContext) {
        this.renderContext = renderContext;
        this.writer = new MockJspWriter();
    }

    public MockJspWriter getWriter() {
        return writer;
    }

    public void flushWriters() throws IOException {
        writer.flush();
    }

    public void initialize(Servlet servlet, ServletRequest request, ServletResponse response, String errorPageURL, boolean needSession, int bufferSize, boolean autoFlush) {
    }

    public void release() {
    }

    public void setAttribute(String name, Object attribute) {
        this.pageAttrs.put(name, attribute);
    }

    public void setAttribute(String name, Object attribute, int scope) {
        switch (scope) {
            case 1:
                this.pageAttrs.put(name, attribute);
                break;
            case 2:
                renderContext.getRequest().setAttribute(name, attribute);
                break;
            case 3:
                renderContext.getRequest().getSession().setAttribute(name, attribute);
                break;
            case 4:
                this.appAttr.put(name, attribute);
                break;
            default:
                throw new IllegalArgumentException("Bad scope " + scope);
        }

    }

    public Object getAttribute(String name) {
        return this.pageAttrs.get(name);
    }

    public Object getAttribute(String name, int scope) {
        switch (scope) {
            case 1:
                return this.pageAttrs.get(name);
            case 2:
                return renderContext.getRequest().getAttribute(name);
            case 3:
                return renderContext.getRequest().getSession().getAttribute(name);
            case 4:
                return this.appAttr.get(name);
            default:
                throw new IllegalArgumentException("Bad scope " + scope);
        }
    }

    public Object findAttribute(String name) {
        if (this.pageAttrs.containsKey(name)) {
            return this.pageAttrs.get(name);
        } else if (this.renderContext.getRequest().getAttribute(name) != null) {
            return this.renderContext.getRequest().getAttribute(name);
        } else if (this.renderContext.getRequest().getSession().getAttribute(name) != null) {
            return this.renderContext.getRequest().getSession().getAttribute(name);
        } else {
            return this.appAttr.containsKey(name) ? this.appAttr.get(name) : null;
        }
    }

    public void removeAttribute(String name) {
        if (this.pageAttrs.containsKey(name)) {
            this.pageAttrs.remove(name);
        } else if (this.renderContext.getRequest().getAttribute(name) != null) {
            this.renderContext.getRequest().removeAttribute(name);
        } else if (this.renderContext.getRequest().getSession().getAttribute(name) != null) {
            this.renderContext.getRequest().getSession().removeAttribute(name);
        } else this.appAttr.remove(name);

    }

    public void removeAttribute(String name, int scope) {
        switch (scope) {
            case 1:
                this.pageAttrs.remove(name);
                break;
            case 2:
                this.renderContext.getRequest().removeAttribute(name);
                break;
            case 3:
                this.renderContext.getRequest().getSession().removeAttribute(name);
                break;
            case 4:
                this.appAttr.remove(name);
                break;
            default:
                throw new IllegalArgumentException("Bad scope " + scope);
        }

    }

    public int getAttributesScope(String name) {
        if (this.pageAttrs.containsKey(name)) {
            return 1;
        } else if (this.renderContext.getRequest().getAttribute(name) != null) {
            return 2;
        } else if (this.renderContext.getRequest().getSession().getAttribute(name) != null) {
            return 3;
        } else {
            return this.pageAttrs.containsKey(name) ? 4 : 0;
        }
    }

    public Enumeration getAttributeNamesInScope(int scope) {
        return null;
    }

    public JspWriter getOut() {
        return writer;
    }

    public HttpSession getSession() {
        return renderContext.getRequest().getSession();
    }

    public Object getPage() {
        return null;
    }

    public ServletRequest getRequest() {
        return renderContext.getRequest();
    }

    public ServletResponse getResponse() {
        return renderContext.getResponse();
    }

    public Exception getException() {
        return null;
    }

    public ServletConfig getServletConfig() {
        return null;
    }

    public ServletContext getServletContext() {
        return null;
    }

    public void forward(String path) {
    }

    public void include(String path) {
    }

    public void handlePageException(Exception exc) {
    }

    public void handlePageException(Throwable exc) {
    }

    public void include(String relativeUrlPath, boolean flush) {
    }

    public ExpressionEvaluator getExpressionEvaluator() {
        return null;
    }

    public VariableResolver getVariableResolver() {
        return null;
    }

    @Override
    public ELContext getELContext() {
        return null;
    }
}
