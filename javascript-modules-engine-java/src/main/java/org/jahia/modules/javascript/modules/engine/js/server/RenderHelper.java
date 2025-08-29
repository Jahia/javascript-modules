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
package org.jahia.modules.javascript.modules.engine.js.server;

import org.apache.commons.beanutils.BeanUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.jackrabbit.util.Text;
import org.apache.taglibs.standard.tag.common.core.ParamParent;
import org.graalvm.polyglot.proxy.ProxyArray;
import org.graalvm.polyglot.proxy.ProxyObject;
import org.jahia.modules.javascript.modules.engine.js.injector.OSGiService;
import org.jahia.modules.javascript.modules.engine.js.mock.MockBodyContent;
import org.jahia.modules.javascript.modules.engine.js.mock.MockPageContext;
import org.jahia.modules.javascript.modules.engine.jsengine.JSNodeMapper;
import org.jahia.services.content.JCRContentUtils;
import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.JCRSessionFactory;
import org.jahia.services.content.JCRTemplate;
import org.jahia.services.content.decorator.JCRSiteNode;
import org.jahia.services.render.RenderContext;
import org.jahia.services.render.RenderException;
import org.jahia.services.render.RenderService;
import org.jahia.services.render.Resource;
import org.jahia.services.usermanager.JahiaUser;
import org.jahia.taglibs.template.include.*;
import org.jahia.taglibs.uicomponents.Functions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.annotation.Nullable;
import javax.inject.Inject;
import javax.jcr.RepositoryException;
import javax.servlet.jsp.JspException;
import javax.servlet.jsp.tagext.BodyTagSupport;
import javax.servlet.jsp.tagext.TagSupport;
import java.io.IOException;
import java.io.Serializable;
import java.lang.reflect.InvocationTargetException;
import java.net.URLDecoder;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Helper class to provide rendering functions to the Javascript engine
 */
public class RenderHelper {
    private static final Logger logger = LoggerFactory.getLogger(RenderHelper.class);
    private static final Set<String> ABSOLUTEAREA_ALLOWED_ATTRIBUTES = Set.of("name", "parent", "view",
            "allowedNodeTypes", "numberOfItems", "nodeType", "editable", "areaType", "limitedAbsoluteAreaEdit",
            "parameters");
    private static final Set<String> AREA_ALLOWED_ATTRIBUTES = Set.of("name", "view", "allowedNodeTypes",
            "numberOfItems", "nodeType", "editable", "parameters");

    private JCRSessionFactory jcrSessionFactory;
    private JCRTemplate jcrTemplate;
    private RenderService renderService;

    public ProxyObject transformToJsNode(JCRNodeWrapper node, boolean includeChildren, boolean includeDescendants,
            boolean includeAllTranslations) throws RepositoryException {
        return recursiveProxyMap(
                JSNodeMapper.toJSNode(node, includeChildren, includeDescendants, includeAllTranslations));
    }

    /**
     * Get the render parameters for the given resource
     *
     * @param resource the resource for which to retrieve the render parameters
     * @return a Map&lt;String,Object&gt; containing the render parameters
     */
    public ProxyObject getRenderParameters(Resource resource) {
        Map<String, Object> moduleParams = new HashMap<>(resource.getModuleParams());
        return recursiveProxyMap(moduleParams);
    }

    /**
     * Does a URL encoding of the <code>path</code>. The characters that
     * don't need encoding are those defined 'unreserved' in section 2.3 of
     * the 'URI generic syntax' RFC 2396. Not the entire path string is escaped,
     * but every individual part (i.e. the slashes are not escaped).
     *
     * @param path the path to encode
     * @return a String containing the escaped path
     * @throws NullPointerException if <code>path</code> is <code>null</code>.
     */
    public String escapePath(String path) {
        return Text.escapePath(path);
    }

    /**
     * Find the first displayable node in the given node's hierarchy. A displayable
     * node is a node that has a content
     * or page template associated with it.
     *
     * @param node          the node at which to start the resolution
     * @param renderContext the current render context
     * @param contextSite   the site in which to resolve the template
     * @return the first displayable {@link JCRNodeWrapper} found in the hierarchy
     */
    public JCRNodeWrapper findDisplayableNode(JCRNodeWrapper node, RenderContext renderContext,
            @Nullable JCRSiteNode contextSite) {
        return JCRContentUtils.findDisplayableNode(node, renderContext, contextSite);
    }

    /**
     * Returns the node which corresponds to the bound component of the
     * j:bindedComponent property in the specified node.
     *
     * @param node    the node to get the bound component for
     * @param context current render context
     * @return the bound {@link JCRNodeWrapper}
     */
    public JCRNodeWrapper getBoundNode(JCRNodeWrapper node, RenderContext context) {
        return Functions.getBoundComponent(node, context, "j:bindedComponent");
    }

    public String renderComponent(Map<String, ?> attr, RenderContext renderContext) throws RepositoryException {
        // first try to get the aliased user from the session (when using customized
        // preview for instance), otherwise use the current user
        JahiaUser user = jcrSessionFactory.getCurrentAliasedUser();
        if (user == null) {
            user = jcrSessionFactory.getCurrentUser();
        }
        return jcrTemplate.doExecuteWithSystemSessionAsUser(user, renderContext.getWorkspace(),
                renderContext.getMainResource().getLocale(), session -> {

                    JCRNodeWrapper node = JSNodeMapper.toVirtualNode((Map<String, ?>) attr.get("content"), session,
                            renderContext);
                    String renderConfig = attr.get("advanceRenderingConfig") != null
                            ? (String) attr.get("advanceRenderingConfig")
                            : "";
                    String templateType = attr.get("templateType") != null ? (String) attr.get("templateType") : "html";

                    if ("OPTION".equals(renderConfig)) {
                        Map<String, Object> optionAttr = new HashMap<>();
                        optionAttr.put("node", node);
                        optionAttr.put("templateType", templateType);
                        optionAttr.put("view", attr.get("view"));
                        optionAttr.put("parameters", attr.get("parameters"));
                        optionAttr.put("nodetype", node.getPrimaryNodeType().getName());
                        try {
                            return renderTag(new OptionTag(), optionAttr, renderContext);
                        } catch (IllegalAccessException | InvocationTargetException | JspException | IOException e) {
                            throw new RepositoryException(e);
                        }
                    } else {
                        Resource r = new Resource(node, templateType, (String) attr.get("view"),
                                "INCLUDE".equals(renderConfig) ? "include" : "module");
                        // TODO TECH-1335 use TO_CACHE_WITH_PARENT_FRAGMENT constant once minimal jahia
                        // version >= 8.2.0.0
                        r.getModuleParams().put("toCacheWithParentFragment", true);

                        try {
                            // handle render parameters for JSON rendering
                            Map<String, Object> renderParameters = (Map<String, Object>) attr.get("parameters");
                            if (renderParameters != null && !renderParameters.isEmpty()) {
                                String charset = renderContext.getResponse().getCharacterEncoding();
                                for (Map.Entry<String, Object> renderParam : renderParameters.entrySet()) {
                                    // only allow String params for compatibility reasons due to JSP ParamParent
                                    // parameters being a <String,String> map
                                    if (renderParam.getValue() instanceof String) {
                                        r.getModuleParams().put(URLDecoder.decode(renderParam.getKey(), charset),
                                                URLDecoder.decode((String) renderParam.getValue(), charset));
                                    }
                                }
                            }

                            return renderService.render(r, renderContext);
                        } catch (RenderException | IOException e) {
                            throw new RepositoryException(e);
                        }
                    }
                });
    }

    public String createContentButtons(String childName, String nodeTypes, boolean editCheck,
            RenderContext renderContext, Resource currentResource)
            throws JspException, InvocationTargetException, IllegalAccessException, RepositoryException, IOException {
        boolean childExists = !"*".equals(childName) && currentResource.getNode().hasNode(childName);
        if (!childExists && (!editCheck || renderContext.isEditMode())) {
            Map<String, Object> attr = new HashMap<>();
            attr.put("path", childName);
            attr.put("nodeTypes", StringUtils.isNotEmpty(nodeTypes) ? nodeTypes : "");
            return renderTag(new ModuleTag(), attr, renderContext);
        }
        return "";
    }

    public String render(Map<String, Object> attr, RenderContext renderContext, Resource currentResource)
            throws JspException, InvocationTargetException, IllegalAccessException, RepositoryException, IOException {

        // handle json node
        if (attr.get("content") != null) {
            return renderComponent(attr, renderContext);
        }
        // if the child node requested is not available, return an empty string
        // This make the path parameter mandatory, that's why is passed as a dedicated
        // param.
        String path = (String) attr.get("path");
        if (path != null) {
            JCRNodeWrapper currentNode = currentResource.getNode();
            if (path.startsWith("/")) {
                if (!currentNode.getSession().nodeExists(path)) {
                    logger.warn("Skipping render of {}, the node doesn't exists", path);
                    return "";
                }
            } else {
                if (!currentNode.hasNode(path)) {
                    logger.warn("Skipping render of {}/{}, the node doesn't exists", currentNode.getPath(), path);
                    return "";
                }
            }
        }

        String renderConfig = attr.get("advanceRenderingConfig") != null ? (String) attr.get("advanceRenderingConfig")
                : "";
        switch (renderConfig) {
            case "INCLUDE": {
                return renderTag(new IncludeTag(), attr, renderContext);
            }
            case "OPTION": {
                return renderTag(new OptionTag(), attr, renderContext);
            }
            default: {
                return renderTag(new ModuleTag(), attr, renderContext);
            }
        }
    }

    /**
     * Render a tag that adds resources to the page. Resources might for example be
     * CSS files, Javascript files or inline
     *
     * @param attr          may contain the following:
     *                      <ul>
     *                      <li>insert (boolean) : If true, the resource will be
     *                      inserted into the document. Typically used
     *                      for on-demand loading of resources.</li>
     *                      <li>async (boolean) : If true, the resource will be
     *                      loaded asynchronously. For scripts, this means
     *                      the script
     *                      will be executed as soon as it's available, without
     *                      blocking the rest of the page.</li>
     *                      <li>defer (boolean) : If true, the resource will be
     *                      deferred, i.e., loaded after the document
     *                      has been parsed.
     *                      For scripts, this means the script will not be executed
     *                      until after the page has loaded.</li>
     *                      <li>type (string) : The type of the resource. This could
     *                      be 'javascript' for .js files, 'css' for
     *                      .css files, etc.
     *                      The type will be used to resolve the directory in the
     *                      module where the resources are located. For example
     *                      for the 'css' type it will look for the resources in the
     *                      css directory of the module.</li>
     *                      <li>resources (string) : The path to the resource file,
     *                      relative to the module. It is also allowed to
     *                      specify multiple resources by separating them with
     *                      commas. It is also allowed to use absolute URLs to
     *                      include remote resources.</li>
     *                      <li>inlineResource (string) : Inline HTML that markup
     *                      will be considered as a resource.</li>
     *                      <li>title (string) : The title of the resource. This is
     *                      typically not used for scripts or stylesheets,
     *                      but may be used for other types of resources.</li>
     *                      <li>key (string) : A unique key for the resource. This
     *                      could be used to prevent duplicate resources
     *                      from being added to the document.</li>
     *                      <li>targetTag (string): The HTML tag where the resource
     *                      should be added. This could be 'head' for
     *                      resources that should be added to the &lt;head&gt; tag,
     *                      'body' for resources that should be added to
     *                      the &lt;body&gt; tag, etc.</li>
     *                      <li>rel (string) : The relationship of the resource to
     *                      the document. This is typically 'stylesheet'
     *                      for CSS files.</li>
     *                      <li>media (string) : The media for which the resource is
     *                      intended. This is typically used for CSS
     *                      files, with values like 'screen', 'print', etc.</li>
     *                      <li>condition (string) : A condition that must be met
     *                      for the resource to be loaded. This could be
     *                      used for conditional comments in IE, for example.</li>
     *                      </ul>
     * @param renderContext the current rendering context
     * @return a String containing the rendered HTML tags for the provided
     *         resources.
     * @throws IllegalAccessException    if the underlying tag cannot be accessed
     * @throws InvocationTargetException if the underlying tag cannot be invoked
     * @throws JspException              if the underlying tag throws a JSP
     *                                   exception
     * @throws IOException               if the underlying tag throws an IO
     *                                   exception
     */
    public String addResources(Map<String, Object> attr, RenderContext renderContext)
            throws IllegalAccessException, InvocationTargetException, JspException, IOException {
        Map<String, Object> ressourcesAttrs = new HashMap<>(attr);

        if (attr.containsKey("inlineResource")) {
            ressourcesAttrs.put("body", attr.get("inlineResource").toString());
        }
        return renderTag(new AddResourcesTag(), ressourcesAttrs, renderContext);
    }

    /**
     * Add a cache dependency to the current resource. This will be used to flush
     * the current resource when the
     * dependencies are modified.
     *
     * @param attr          may be the following:
     *                      <ul>
     *                      <li>node (JCRNodeWrapper) : The node to add as a
     *                      dependency.</li>
     *                      <li>uuid (String) : The UUID of the node to add as a
     *                      dependency.</li>
     *                      <li>path (String) : The path of the node to add as a
     *                      dependency.</li>
     *                      <li>flushOnPathMatchingRegexp (String) : A regular
     *                      expression that will be used to flush the cache
     *                      when the path of the modified nodes matches the regular
     *                      expression.</li>
     *                      </ul>
     * @param renderContext the current rendering context
     * @throws IllegalAccessException    if the underlying tag cannot be accessed
     * @throws InvocationTargetException if the underlying tag cannot be invoked
     * @throws JspException              if the underlying tag throws a JSP
     *                                   exception
     * @throws IOException               if the underlying tag throws an IO
     *                                   exception
     */
    public void addCacheDependency(Map<String, Object> attr, RenderContext renderContext)
            throws IllegalAccessException, InvocationTargetException, JspException, IOException {
        renderTag(new AddCacheDependencyTag(), attr, renderContext);
    }

    /**
     * Calculate the relative path from one node to another node.
     *
     * @param currentPath the path of the current node from which to calculate the
     *                    relative path
     * @param basePath    the path of the base node to which to calculate the
     *                    relative path
     * @return the relative path from <code>currentPath</code> to
     *         <code>basePath</code>
     */
    static String calculateRelativePath(String currentPath, String basePath) {
        // special case when the parent is the current node
        if (currentPath.equals(basePath)) {
            return ".";
        }
        String[] currentPathParts = currentPath.split("/");
        String[] parentPathParts = basePath.split("/");

        // Find the common prefix length
        int commonLength = 0;
        while (commonLength < currentPathParts.length && commonLength < parentPathParts.length
                && currentPathParts[commonLength].equals(parentPathParts[commonLength])) {
            commonLength++;
        }

        // Calculate the number of steps to go up from the current node to the common
        // prefix
        int stepsUp = currentPathParts.length - commonLength;

        // Build the relative path
        StringBuilder relativePath = new StringBuilder();
        for (int i = 0; i < stepsUp; i++) {
            relativePath.append("../");
        }
        for (int i = commonLength; i < parentPathParts.length; i++) {
            relativePath.append(parentPathParts[i]);
            if (i < parentPathParts.length - 1) {
                relativePath.append("/");
            }
        }

        return relativePath.toString();
    }

    private static <T> T readMandatoryAttribute(Map<String, Object> attr, String attributeName) {
        T name = (T) attr.remove(attributeName);
        if (name == null) {
            throw new IllegalStateException(String.format("Attribute '%s' is required", attributeName));
        }
        return name;
    }

    public String renderAbsoluteArea(Map<String, Object> attr, RenderContext renderContext)
            throws JspException, InvocationTargetException, IllegalAccessException, IOException {
        checkAttributes(attr, ABSOLUTEAREA_ALLOWED_ATTRIBUTES);
        // path handling
        String name = readMandatoryAttribute(attr, "name");
        JCRNodeWrapper parent = readMandatoryAttribute(attr, "parent");
        String relativePath = calculateRelativePath(renderContext.getSite().getPath(), parent.getPath());
        attr.put("path", relativePath + "/" + name);
        return internalRenderArea(attr, "absoluteArea", renderContext);
    }

    public String renderArea(Map<String, Object> attr, RenderContext renderContext)
            throws IllegalAccessException, InvocationTargetException, JspException, IOException {
        checkAttributes(attr, AREA_ALLOWED_ATTRIBUTES);
        // This is actually expected, the path of an area is relative by default, so the
        // name is directly mapped to: path
        // the AreaTag will resolve the area content using template inheritance
        // hierarchy.
        // Even if it's not used in the javascript engine, we need to respect this
        // concept for compatibility with existing system relying on this behavior.
        // (jExperience for example is using this behavior, for page perso/opti, by
        // pushing the page variant node as parent template)
        attr.put("path", readMandatoryAttribute(attr, "name"));
        return internalRenderArea(attr, "area", renderContext);
    }

    private String internalRenderArea(Map<String, Object> attr, String moduleType, RenderContext renderContext)
            throws IllegalAccessException, InvocationTargetException, JspException, IOException {
        // We copy the attributes to avoid modifying the original map
        Map<String, Object> areaAttr = new HashMap<>(attr);
        areaAttr.put("moduleType", moduleType);
        // We now have to transform the attr properties into something that the AreaTag
        // can understand
        Object allowedTypes = areaAttr.get("allowedNodeTypes");
        if (allowedTypes != null) {
            if (allowedTypes instanceof List) {
                areaAttr.put("nodeTypes", StringUtils.join((List) allowedTypes, ' '));
                areaAttr.remove("allowedNodeTypes");
            }
            if (allowedTypes.getClass().isArray()) {
                Object[] allowedTypeArray = (Object[]) allowedTypes;
                areaAttr.put("nodeTypes", StringUtils.join(allowedTypeArray, ' '));
                areaAttr.remove("allowedNodeTypes");
            }
        }

        if (areaAttr.get("numberOfItems") != null) {
            areaAttr.put("listLimit", areaAttr.get("numberOfItems"));
            areaAttr.remove("numberOfItems");
        }
        areaAttr.put("areaType", areaAttr.remove("nodeType"));
        areaAttr.put("level", -1); // force the "path" parameter to be computed against the root node of the site
                                   // (ex: /sites/<my-site>)

        // Now we remove any null attribute to make sure they don't override default tag
        // attributes
        areaAttr = cleanupNullValues(areaAttr);

        return renderTag(new AreaTag(), areaAttr, renderContext);
    }

    private Map<String, Object> cleanupNullValues(Map<String, Object> mapToClean) {
        return mapToClean.entrySet().stream()
                .filter(entry -> entry.getValue() != null)
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }

    private String renderTag(TagSupport tag, Map<String, Object> attr, RenderContext renderContext)
            throws IllegalAccessException, InvocationTargetException, JspException, IOException {
        Map<String, Serializable> renderParameters = (Map<String, Serializable>) attr.get("parameters");
        if (renderParameters != null && !renderParameters.isEmpty() && tag instanceof ParamParent) {
            for (Map.Entry<String, Serializable> tagParam : renderParameters.entrySet()) {
                // only allow String params due to ParamParent parameters being a
                // <String,String> map
                if (tagParam.getValue() instanceof String) {
                    ((ParamParent) tag).addParameter(tagParam.getKey(), (String) tagParam.getValue());
                }
            }
        }

        String body = null;
        if (tag instanceof BodyTagSupport && attr.get("body") != null) {
            body = (String) attr.get("body");
        }

        safePopulate(tag, attr);
        MockPageContext pageContext = new MockPageContext(renderContext);
        tag.setPageContext(pageContext);
        tag.doStartTag();
        try {
            if (tag instanceof BodyTagSupport && body != null) {
                MockPageContext bodyPageContext = new MockPageContext(renderContext);
                bodyPageContext.getOut().print(body);
                tag.setPageContext(bodyPageContext);
                ((BodyTagSupport) tag).setBodyContent(new MockBodyContent(bodyPageContext.getWriter()));
                tag.doAfterBody();
                bodyPageContext.flushWriters();
            }
        } finally {
            tag.setPageContext(pageContext);
        }
        tag.doEndTag();
        pageContext.flushWriters();
        return pageContext.getWriter().getString();
    }

    private ProxyObject recursiveProxyMap(Map<String, Object> mapToProxy) {
        for (Map.Entry<String, Object> entry : mapToProxy.entrySet()) {
            if (entry.getValue() instanceof Map) {
                mapToProxy.put(entry.getKey(), recursiveProxyMap((Map<String, Object>) entry.getValue()));
            }
            if (entry.getValue() instanceof Collection) {
                mapToProxy.put(entry.getKey(),
                        ProxyArray.fromList((List<Object>) ((Collection) entry.getValue()).stream().map(o -> {
                            if (o instanceof Map) {
                                return recursiveProxyMap((Map<String, Object>) o);
                            }
                            return o;
                        }).collect(Collectors.toList())));
            }
        }
        return ProxyObject.fromMap(mapToProxy);
    }

    // Utility method to populate a tag with attributes ignoring any missing
    // attributes.
    private void safePopulate(Object tag, Map<String, Object> attr) {
        for (Map.Entry<String, Object> entry : attr.entrySet()) {
            try {
                BeanUtils.setProperty(tag, entry.getKey(), entry.getValue());
            } catch (Throwable e) {
                // Ignore any errors
            }
        }
    }

    @Inject
    @OSGiService
    public void setJcrSessionFactory(JCRSessionFactory jcrSessionFactory) {
        this.jcrSessionFactory = jcrSessionFactory;
    }

    @Inject
    @OSGiService
    public void setJcrTemplate(JCRTemplate jcrTemplate) {
        this.jcrTemplate = jcrTemplate;
    }

    @Inject
    @OSGiService
    public void setRenderService(RenderService renderService) {
        this.renderService = renderService;
    }

    private void checkAttributes(Map<String, Object> attributes, Set<String> allowedAttributes) {
        for (String attr : attributes.keySet()) {
            if (!allowedAttributes.contains(attr)) {
                throw new IllegalArgumentException("Attribute " + attr + " is not allowed");
            }
        }
    }

}
