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
package org.jahia.modules.javascript.modules.engine;

import org.jahia.modules.javascript.modules.engine.jsengine.GraalVMEngine;
import org.jahia.modules.javascript.modules.engine.registrars.Registrar;
import org.jahia.data.templates.JahiaTemplatesPackage;
import org.jahia.services.templates.JahiaTemplateManagerService;
import org.osgi.framework.Bundle;
import org.osgi.framework.BundleContext;
import org.osgi.framework.BundleEvent;
import org.osgi.framework.BundleListener;
import org.osgi.service.component.annotations.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Arrays;
import java.util.List;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.stream.Collectors;

import static org.jahia.modules.javascript.modules.engine.jshandler.JavascriptProtocolConnection.BUNDLE_HEADER_JAVASCRIPT_INIT_SCRIPT;

/**
 * Listener to execute scripts at activate/deactivate time
 */
// published under its own type as well: the development endpoint reloads a module through it
@Component(immediate = true, service = {JavascriptModuleListener.class, BundleListener.class})
public class JavascriptModuleListener implements BundleListener {
    private static final Logger logger = LoggerFactory.getLogger(JavascriptModuleListener.class);
    private GraalVMEngine engine;
    private JahiaTemplateManagerService templateManagerService;
    private final Queue<Registrar> registrars = new ConcurrentLinkedQueue<>();

    @Reference(cardinality = ReferenceCardinality.MANDATORY)
    public void setEngine(GraalVMEngine engine) {
        this.engine = engine;
    }

    @Reference(cardinality = ReferenceCardinality.MANDATORY)
    public void setTemplateManagerService(JahiaTemplateManagerService templateManagerService) {
        this.templateManagerService = templateManagerService;
    }

    @Reference(service = Registrar.class, policy = ReferencePolicy.DYNAMIC, cardinality = ReferenceCardinality.MULTIPLE, policyOption = ReferencePolicyOption.GREEDY)
    public void addRegistrar(Registrar registrar) {
        for (Bundle bundle : getJavascriptModules()) {
            registrar.register(bundle);
        }

        registrars.add(registrar);
    }

    public void removeRegistrar(Registrar registrar) {
        registrars.remove(registrar);

        for (Bundle bundle : getJavascriptModules()) {
            registrar.unregister(bundle);
        }
    }

    @Activate
    public void activate(BundleContext context) {
        for (Bundle bundle : getJavascriptModules()) {
            engine.enableJavascriptModule(bundle);
        }

        context.addBundleListener(this);
    }

    @Deactivate
    public void deactivate(BundleContext context) {
        context.removeBundleListener(this);

        for (Bundle bundle : getJavascriptModules()) {
            engine.disableJavascriptModule(bundle);
        }
    }

    @Override
    public void bundleChanged(BundleEvent event) {
        try {
            Bundle bundle = event.getBundle();
            if (isJavascriptModule(bundle)) {
                if (event.getType() == BundleEvent.STARTED) {
                    engine.enableJavascriptModule(bundle);
                    for (Registrar registrar : registrars) {
                        registrar.register(bundle);
                    }
                } else if (event.getType() == BundleEvent.STOPPED) {
                    for (Registrar registrar : registrars) {
                        registrar.unregister(bundle);
                    }
                    engine.disableJavascriptModule(bundle);
                }
            }
        } catch (Exception e) {
            logger.error("Cannot handle event {}", event.toString(), e);
        }
    }

    /**
     * Swaps a started module's server bundle for freshly built code and re-registers everything it
     * declares, without going through an OSGi restart.
     *
     * <p>The registrars are unregistered first: they accumulate their OSGi service registrations, so
     * registering twice in a row would publish a module's render filters and actions twice. The
     * engine update between the two bumps the context version, so the registrars re-read the new
     * registry when they borrow a context, and the reload is complete when this method returns.
     *
     * <p>Only what the server bundle carries is reloaded. Node type definitions, imported content,
     * resource bundles and static resources come from the deployed bundle and still need a redeploy.
     *
     * <p>Synchronized: each reload bumps the engine's context version, and two of them racing leaves
     * the pool destroying contexts a concurrent borrow is still trying to validate.
     *
     * @param bundle a started JavaScript module
     * @param code the server bundle to run from now on
     */
    public synchronized void reloadServerBundle(Bundle bundle, String code) {
        List<Registrar> hotReloadable = registrars.stream()
                .filter(Registrar::runsOnHotReload)
                .collect(Collectors.toList());

        for (Registrar registrar : hotReloadable) {
            registrar.unregister(bundle);
        }
        engine.updateJavascriptModuleSource(bundle, code);
        for (Registrar registrar : hotReloadable) {
            registrar.register(bundle);
        }

        dropWhatJahiaDerivedFrom(bundle.getSymbolicName());
    }

    /**
     * Tells the rest of Jahia to drop what it derived from a module: the HTML fragment cache above
     * all, which development mode does not disable.
     *
     * <p>A redeploy does this through a bundle event. Nothing a development server does raises one —
     * neither swapping the module's code nor attaching to it, though both change what pages render —
     * so the engine has to say it itself.
     *
     * @param module the module's OSGi symbolic name
     */
    public void dropWhatJahiaDerivedFrom(String module) {
        JahiaTemplatesPackage templatePackage = templateManagerService.getTemplatePackageById(module);
        if (templatePackage != null) {
            templateManagerService.fireTemplatePackageRedeployedEvent(templatePackage);
        }
    }

    public List<Bundle> getJavascriptModules() {
        return Arrays.stream(engine.getBundleContext().getBundles())
                .filter(bundle -> bundle.getState() == Bundle.ACTIVE && isJavascriptModule(bundle))
                .collect(Collectors.toList());
    }

    public boolean isJavascriptModule(Bundle bundle) {
        return bundle.getBundleId() != engine.getBundleContext().getBundle().getBundleId() &&
                bundle.getHeaders().get(BUNDLE_HEADER_JAVASCRIPT_INIT_SCRIPT) != null;
    }
}
