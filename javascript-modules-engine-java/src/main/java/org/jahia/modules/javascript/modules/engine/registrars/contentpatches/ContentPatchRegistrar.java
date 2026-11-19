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
package org.jahia.modules.javascript.modules.engine.registrars.contentpatches;

import org.graalvm.polyglot.Value;
import org.jahia.modules.javascript.modules.engine.jsengine.GraalVMEngine;
import org.jahia.modules.javascript.modules.engine.registrars.Registrar;
import org.jahia.services.modulemanager.persistence.jcr.BundleInfoJcrHelper;
import org.jahia.settings.SettingsBean;
import org.json.JSONObject;
import org.osgi.framework.Bundle;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.ConfigurationPolicy;
import org.osgi.service.component.annotations.Modified;
import org.osgi.service.component.annotations.Reference;
import org.osgi.service.component.annotations.ReferenceCardinality;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.jcr.RepositoryException;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Runs the pending patches of a JavaScript module when the module starts.
 *
 * <p>Content patches are JavaScript registry entries of type {@code content patch}, declared through the
 * library's {@code registerContentPatch} wrapper. On {@code BundleEvent.STARTED} (the once-per-start
 * {@link Registrar} seam), this registrar — on the processing server only — sorts the module's
 * patches by name, filters out the ones already recorded in Jahia's module patch status store
 * ({@code /module-management} → {@code j:bundlesScripts}, the same store used for Groovy
 * {@code META-INF/patches}), and executes the pending ones in order.
 *
 * <p>Results mirror the Groovy patcher contract: {@code .installed} (completed), {@code .skipped}
 * (the script called {@code skip()}), {@code .failed} (the script threw). All results are terminal:
 * a recorded content patch never re-runs, whatever its outcome. On {@code .failed}, the module's
 * remaining patches are halted (they stay pending) but the module itself keeps starting —
 * failures never break module startup.
 *
 * <p>The {@code autoRun} configuration property (PID
 * {@code org.jahia.modules.javascript.modules.engine.contentpatches}, default {@code true}) can be set
 * to {@code false} on development/staging servers: pending patches are then only logged, and
 * execution is deferred to an explicit trigger.
 *
 * <p>The {@code dryRun} configuration property (same PID, default {@code false}) executes pending
 * patches in dry-run mode: the {@code patch.*} helpers and sessions log what they would change
 * without persisting, and no result is recorded in the status store — the patches stay pending.
 */
@Component(service = Registrar.class, immediate = true,
        configurationPid = ContentPatchRegistrar.CONFIG_PID, configurationPolicy = ConfigurationPolicy.OPTIONAL)
public class ContentPatchRegistrar implements Registrar {

    public static final String REGISTRY_TYPE = "content-patch";
    public static final String CONFIG_PID = "org.jahia.modules.javascript.modules.engine.contentpatches";

    /** Pseudo-path prefix distinguishing JS patches from Groovy patch entries in the shared status store. */
    public static final String STATUS_PATH_PREFIX = "/javascript/content-patches/";

    public static final String RESULT_INSTALLED = ".installed";
    public static final String RESULT_SKIPPED = ".skipped";
    public static final String RESULT_FAILED = ".failed";

    private static final Logger logger = LoggerFactory.getLogger(ContentPatchRegistrar.class);

    protected GraalVMEngine graalVMEngine;
    private boolean autoRun = true;
    private boolean dryRun = false;

    @Reference(cardinality = ReferenceCardinality.MANDATORY)
    public void setGraalVMEngine(GraalVMEngine graalVMEngine) {
        this.graalVMEngine = graalVMEngine;
    }

    @Activate
    @Modified
    public void activate(Map<String, ?> props) {
        Object value = props.get("autoRun");
        this.autoRun = value == null || Boolean.parseBoolean(value.toString());
        Object dryRunValue = props.get("dryRun");
        this.dryRun = dryRunValue != null && Boolean.parseBoolean(dryRunValue.toString());
    }

    @Override
    public void register(Bundle bundle) {
        try {
            if (!isProcessingServer()) {
                return;
            }
            List<Map<String, Object>> patches = findContentPatches(bundle);
            if (patches.isEmpty()) {
                return;
            }
            patches.sort(Comparator.comparing(entry -> String.valueOf(entry.get("name"))));

            String symbolicName = bundle.getSymbolicName();
            JSONObject status = getStatus(symbolicName);
            // A recorded failure is a persistent barrier: patches ordered after the first
            // .failed one stay held (across restarts and redeploys) until that record is cleared
            // and the content patch succeeds — otherwise later patches would run on the next module
            // start even though an earlier one never completed.
            String failedBarrier = patches.stream()
                    .map(entry -> String.valueOf(entry.get("name")))
                    .filter(name -> RESULT_FAILED.equals(status.optString(STATUS_PATH_PREFIX + name)))
                    .findFirst().orElse(null);
            List<Map<String, Object>> pending = patches.stream()
                    .filter(entry -> !status.has(STATUS_PATH_PREFIX + entry.get("name")))
                    .filter(entry -> failedBarrier == null
                            || String.valueOf(entry.get("name")).compareTo(failedBarrier) < 0)
                    .collect(java.util.stream.Collectors.toList());
            if (failedBarrier != null) {
                long held = patches.stream()
                        .filter(entry -> !status.has(STATUS_PATH_PREFIX + entry.get("name")))
                        .count() - pending.size();
                if (held > 0) {
                    logger.warn("Module {} has {} content patch(es) held back behind failed content patch {} — "
                            + "fix it and clear its record to let them run", symbolicName, held, failedBarrier);
                }
            }
            if (pending.isEmpty()) {
                logger.debug("No pending content patch for module {}", symbolicName);
                return;
            }
            if (!autoRun) {
                logger.info("Module {} has {} pending content patch(es) but autoRun is disabled — waiting for an explicit trigger",
                        symbolicName, pending.size());
                return;
            }

            logger.info("Running {} pending content patch(es) for module {} {}", pending.size(), symbolicName,
                    bundle.getVersion());
            for (Map<String, Object> entry : pending) {
                String name = String.valueOf(entry.get("name"));
                long startTime = System.currentTimeMillis();
                String result = executeContentPatch(bundle, String.valueOf(entry.get("key")), name);
                if (dryRun) {
                    logger.info("[dry-run] ContentPatch {} of module {} would record {} ({}ms) — "
                            + "nothing persisted, the patch stays pending", name, symbolicName,
                            result, System.currentTimeMillis() - startTime);
                } else {
                    status.put(STATUS_PATH_PREFIX + name, result);
                    try {
                        storeStatus(symbolicName, status);
                    } catch (RepositoryException e) {
                        logger.error("ContentPatch {} of module {} executed with result {} but the status store "
                                + "could not be updated: the run-once guarantee is broken and it WILL run again "
                                + "on the next module start. Halting the module's remaining patches.",
                                name, symbolicName, result, e);
                        return;
                    }
                    logger.info("ContentPatch {} of module {} finished with result {} in {}ms", name, symbolicName,
                            result, System.currentTimeMillis() - startTime);
                }
                if (RESULT_FAILED.equals(result)) {
                    logger.error("ContentPatch {} of module {} failed — halting the module's remaining patches "
                            + "(they stay pending). The module keeps starting.", name, symbolicName);
                    break;
                }
            }
        } catch (Exception e) {
            // Failures here must never prevent the module from starting
            logger.error("Unable to run patches of bundle {}", bundle.getSymbolicName(), e);
        }
    }

    @Override
    public void unregister(Bundle bundle) {
        // nothing to tear down: patches leave no live service behind
    }

    private List<Map<String, Object>> findContentPatches(Bundle bundle) {
        return graalVMEngine.doWithContext(contextProvider -> {
            Map<String, Object> filter = new HashMap<>();
            filter.put("type", REGISTRY_TYPE);
            filter.put("bundleKey", bundle.getSymbolicName());
            return contextProvider.getRegistry().find(filter);
        });
    }

    /**
     * Executes one content patch inside a GraalVM context, re-resolving the registry entry by key (JS
     * handles must not be cached outside a context). Returns the result string to record.
     * Protected as a seam for unit tests.
     */
    protected String executeContentPatch(Bundle bundle, String key, String name) {
        try {
            return graalVMEngine.doWithContext(contextProvider -> {
                Map<String, Object> entry = contextProvider.getRegistry().get(REGISTRY_TYPE, key);
                if (entry == null || entry.get("execute") == null) {
                    logger.error("ContentPatch {} of module {} is no longer available in the registry",
                            name, bundle.getSymbolicName());
                    return RESULT_FAILED;
                }
                Value result = Value.asValue(entry.get("execute")).execute(newContentPatchSupport(bundle));
                if (result != null && result.isString()) {
                    String resultString = result.asString();
                    if (RESULT_INSTALLED.equals(resultString) || RESULT_SKIPPED.equals(resultString)) {
                        return resultString;
                    }
                    logger.warn("ContentPatch {} of module {} returned unexpected result '{}', recording {}",
                            name, bundle.getSymbolicName(), resultString, RESULT_INSTALLED);
                }
                return RESULT_INSTALLED;
            });
        } catch (Exception e) {
            logger.error("ContentPatch {} of module {} threw an error", name, bundle.getSymbolicName(), e);
            return RESULT_FAILED;
        }
    }

    // Seams overridable in unit tests

    protected boolean isProcessingServer() {
        return SettingsBean.getInstance().isProcessingServer();
    }

    protected JSONObject getStatus(String symbolicName) throws RepositoryException {
        return BundleInfoJcrHelper.getModuleScriptsStatus(symbolicName);
    }

    protected void storeStatus(String symbolicName, JSONObject status) throws RepositoryException {
        BundleInfoJcrHelper.storeModuleScriptStatus(symbolicName, status);
    }

    protected ContentPatchSupport newContentPatchSupport(Bundle bundle) {
        return new ContentPatchSupport(bundle, dryRun);
    }
}
