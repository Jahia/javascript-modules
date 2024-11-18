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

import org.jahia.data.templates.JahiaTemplatesPackage;
import org.jahia.modules.npm.modules.engine.jsengine.ContextProvider;
import org.jahia.modules.npm.modules.engine.jsengine.GraalVMEngine;
import org.jahia.modules.npm.modules.engine.views.JSScript;
import org.jahia.modules.npm.modules.engine.views.JSView;
import org.jahia.registries.ServicesRegistry;
import org.jahia.services.content.decorator.JCRSiteNode;
import org.jahia.services.content.nodetypes.ExtendedNodeType;
import org.jahia.services.content.nodetypes.NodeTypeRegistry;
import org.jahia.services.observation.JahiaEventListener;
import org.jahia.services.render.*;
import org.jahia.services.render.scripting.Script;
import org.jahia.services.render.scripting.ScriptResolver;
import org.jahia.services.templates.JahiaTemplateManagerService;
import org.osgi.framework.Bundle;
import org.osgi.framework.BundleContext;
import org.osgi.service.component.annotations.*;

import javax.jcr.RepositoryException;
import javax.jcr.nodetype.NoSuchNodeTypeException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Component(immediate = true, service = {ViewsRegistrar.class, Registrar.class, ScriptResolver.class, JahiaEventListener.class})
public class ViewsRegistrar implements ScriptResolver, TemplateResolver, Registrar, JahiaEventListener<EventObject> {

    private static final Class<EventObject>[] ACCEPTED_EVENT_TYPES = new Class[] {
            JahiaTemplateManagerService.TemplatePackageRedeployedEvent.class,
            JahiaTemplateManagerService.ModuleDeployedOnSiteEvent.class,
            JahiaTemplateManagerService.ModuleDependenciesEvent.class
    };
    private RenderService renderService;
    private GraalVMEngine graalVMEngine;

    private final Map<String, Collection<JSView>> viewsPerBundle = new HashMap<>();

    private static final Map<String, Set<String>> siteJSModulesCache = new ConcurrentHashMap<>(15);
    private static final Map<String, SortedSet<JSView>> viewSetCache = new ConcurrentHashMap<>(512);

    @Reference
    public void setRenderService(RenderService renderService) {
        this.renderService = renderService;
    }

    @Reference(cardinality = ReferenceCardinality.MANDATORY)
    public void setGraalVMEngine(GraalVMEngine graalVMEngine) {
        this.graalVMEngine = graalVMEngine;
    }

    @Activate
    public void activate(BundleContext context) {
        List<ScriptResolver> scriptResolvers = new ArrayList<>(renderService.getScriptResolvers());
        scriptResolvers.add(0, this);
        renderService.setScriptResolvers(scriptResolvers);

        List<TemplateResolver> templateResolvers = new ArrayList<>(renderService.getTemplateResolvers());
        templateResolvers.add(0, this);
        renderService.setTemplateResolvers(templateResolvers);
    }

    @Deactivate
    public void deactivate(BundleContext context) {
        List<ScriptResolver> scriptResolvers = new ArrayList<>(renderService.getScriptResolvers());
        scriptResolvers.remove(this);
        renderService.setScriptResolvers(scriptResolvers);

        List<TemplateResolver> templateResolvers = new ArrayList<>(renderService.getTemplateResolvers());
        templateResolvers.remove(this);
        renderService.setTemplateResolvers(templateResolvers);
    }
    @Override
    public void register(Bundle bundle) {
        Set<JSView> views = new HashSet<>();

        graalVMEngine.doWithContext(contextProvider -> {
            views.addAll(getRegistryViewsSet(bundle, contextProvider));
        });

        viewsPerBundle.put(bundle.getSymbolicName(), views);
        clearCache();
    }

    @Override
    public void unregister(Bundle bundle) {
        viewsPerBundle.remove(bundle.getSymbolicName());
        clearCache();
    }

    private Collection<JSView> getRegistryViewsSet(Bundle bundle, ContextProvider contextProvider) {
        JahiaTemplatesPackage module = ServicesRegistry.getInstance().getJahiaTemplateManagerService().getTemplatePackageById(bundle.getSymbolicName());
        Map<String, Object> filter = new HashMap<>();
        filter.put("type", "view");
        filter.put("bundleKey", bundle.getSymbolicName());
        return contextProvider.getRegistry()
                .find(filter)
                .stream()
                .map(registryEntry -> new JSView(registryEntry, module))
                .collect(Collectors.toSet());
    }

    @Override
    public Script resolveScript(Resource resource, RenderContext renderContext) throws TemplateNotFoundException {
        try {
            return new JSScript(resolveView(resource, renderContext), graalVMEngine);
        } catch (RepositoryException e) {
            throw new TemplateNotFoundException(e);
        }
    }

    @Override
    public boolean hasTemplate(String templateName, ExtendedNodeType nodeType, Set<String> templatePackages) throws RepositoryException {
        Set<String> involvedJSModules = filterModulesWithJSViews(templatePackages);
        if (involvedJSModules.isEmpty()) {
            return false;
        }

        SortedSet<View> templates = getViewsSet(nodeType, involvedJSModules, "html", true);
        return templates.stream().anyMatch(v -> v.getKey().equals(templateName));
    }

    @Override
    public Template resolveTemplate(Resource resource, RenderContext renderContext) throws RepositoryException {
        if ("page".equals(resource.getContextConfiguration()) && !renderContext.isAjaxRequest()) {
            // JS templates are just JS views, so we just read already resolved script for resource.
            Script script = resource.getScript(renderContext);
            if (script != null && script.getView() instanceof JSView && ((JSView) script.getView()).isTemplate()) {
                Template template = new Template(script.getView().getKey(), null, null, resource.getResolvedTemplate(), 0);
                template.setExternal(true);
                return template;
            }
        }
        return null;
    }

    private JSView resolveView(Resource resource, RenderContext renderContext) throws RepositoryException, TemplateNotFoundException {
        ExtendedNodeType nt = resource.getNode().getPrimaryNodeType();
        List<ExtendedNodeType> nodeTypeList = getNodeTypeList(nt);
        for (ExtendedNodeType type : resource.getNode().getMixinNodeTypes()) {
            nodeTypeList.addAll(0, type.getSupertypeSet());
            nodeTypeList.add(0, type);
        }

        if (resource.getResourceNodeType() != null) {
            nodeTypeList.addAll(0, getNodeTypeList(resource.getResourceNodeType()));
        }

        return resolveView(resource, nodeTypeList, renderContext);
    }

    private List<ExtendedNodeType> getNodeTypeList(ExtendedNodeType nt) throws NoSuchNodeTypeException {
        List<ExtendedNodeType> nodeTypeList = new LinkedList<>();
        nodeTypeList.add(nt);
        nodeTypeList.addAll(nt.getSupertypeSet());
        ExtendedNodeType base = NodeTypeRegistry.getInstance().getNodeType("nt:base");
        if (nodeTypeList.remove(base)) {
            nodeTypeList.add(base);
        }
        return nodeTypeList;
    }

    private JSView resolveView(Resource resource, List<ExtendedNodeType> nodeTypeList, RenderContext renderContext) throws RepositoryException, TemplateNotFoundException {
        // Are we rendering the page level node (main resource) ?
        boolean pageRendering = "page".equals(resource.getContextConfiguration()) && !renderContext.isAjaxRequest();

        // Check what is the template key of the current resource
        // in case of full page rendering we need to check for j:templateName prop, mostly used on jnt:page
        String template;
        if (pageRendering && "default".equals(resource.getTemplate())) {
            if (resource.getNode().hasProperty("j:templateName")) {
                template = resource.getNode().getProperty("j:templateName").getString();
            } else {
                template = "default";
            }
        } else {
            template = resource.getResolvedTemplate();
        }

        JCRSiteNode site = renderContext.getSite() != null ? renderContext.getSite() : resource.getNode().getResolveSite();
        return (JSView) nodeTypeList.stream().flatMap(nodeType -> getViewsSet(nodeType, site, resource.getTemplateType(), pageRendering).stream())
                .filter(v -> {
                    JSView jsv = (JSView) v;
                    // pageRendering -> JSView should be a template
                    boolean templateMatch = pageRendering == jsv.isTemplate();
                    // view key should match the resolved template
                    boolean viewMatch = v.getKey().equals(template);
                    return templateMatch && viewMatch;
                })
                .findFirst()
                .orElseThrow(() -> new TemplateNotFoundException(resource.getResolvedTemplate()));
    }

    @Override
    public boolean hasView(ExtendedNodeType nt, String viewName, JCRSiteNode site, String templateType) {
        return getViewsSet(nt, site, templateType, false).stream().anyMatch(v -> v.getKey().equals(viewName));
    }

    @Override
    public SortedSet<View> getViewsSet(ExtendedNodeType extendedNodeType, JCRSiteNode jcrSiteNode, String templateType) {
        return getViewsSet(extendedNodeType, jcrSiteNode, templateType, false);
    }

    public SortedSet<View> getViewsSet(ExtendedNodeType extendedNodeType, JCRSiteNode jcrSiteNode, String templateType, boolean pageRendering) {
        Set<String> involvedJSModules = siteJSModulesCache.computeIfAbsent(jcrSiteNode.getPath(),
                k -> filterModulesWithJSViews(jcrSiteNode.getInstalledModulesWithAllDependencies()));

        // If no JS module involved in the site, return empty set
        if (involvedJSModules.isEmpty()) {
            return Collections.emptySortedSet();
        }

        return getViewsSet(extendedNodeType, involvedJSModules, templateType, pageRendering);
    }

    private SortedSet<View> getViewsSet(ExtendedNodeType extendedNodeType, Set<String> moduleNames, String templateType, boolean pageRendering) {
        return moduleNames.stream()
                .filter(viewsPerBundle::containsKey)
                .flatMap(moduleName -> {
                    String cacheKey = extendedNodeType.getName() + "_" + moduleName + "_" + templateType + "_" + pageRendering;
                    return viewSetCache.computeIfAbsent(cacheKey, key -> viewsPerBundle.get(moduleName).stream()
                            .filter(v -> extendedNodeType.isNodeType(v.getNodeType()))
                            .filter(v -> templateType.equals(v.getTemplateType()))
                            .filter(v -> pageRendering == v.isTemplate())
                            .collect(Collectors.toCollection(TreeSet::new))).stream();
                })
                .collect(Collectors.toCollection(() -> new TreeSet<>(Comparator.comparing(o -> (JSView) o))));
    }

    private Set<String> filterModulesWithJSViews(Set<String> moduleNames) {
        return moduleNames.stream()
                .filter(viewsPerBundle::containsKey)
                .collect(Collectors.toSet());
    }

    private void clearCache() {
        siteJSModulesCache.clear();
        viewSetCache.clear();
    }

    @Override
    public void onEvent(EventObject eventObject) {
        clearCache();
    }

    @Override
    public Class<EventObject>[] getEventTypes() {
        return ACCEPTED_EVENT_TYPES;
    }

    @Override
    public void flushCache(String modulePath) {
        // Do nothing
        // this was originally made to flush JCR Template nodes for Jahia templating resolution.
    }
}
