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
@Component(immediate = true)
public class JavascriptModuleListener implements BundleListener {
	private static final Logger logger = LoggerFactory.getLogger(JavascriptModuleListener.class);
	private GraalVMEngine engine;
	private final Queue<Registrar> registrars = new ConcurrentLinkedQueue<>();

	@Reference(cardinality = ReferenceCardinality.MANDATORY)
	public void setEngine(GraalVMEngine engine) {
		this.engine = engine;
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
