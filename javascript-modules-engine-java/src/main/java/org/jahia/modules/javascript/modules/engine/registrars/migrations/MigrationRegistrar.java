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
package org.jahia.modules.javascript.modules.engine.registrars.migrations;

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
 * Runs the pending migrations of a JavaScript module when the module starts.
 *
 * <p>Migrations are JavaScript registry entries of type {@code migration}, declared through the
 * library's {@code registerMigration} wrapper. On {@code BundleEvent.STARTED} (the once-per-start
 * {@link Registrar} seam), this registrar — on the processing server only — sorts the module's
 * migrations by name, filters out the ones already recorded in Jahia's module patch status store
 * ({@code /module-management} → {@code j:bundlesScripts}, the same store used for Groovy
 * {@code META-INF/patches}), and executes the pending ones in order.
 *
 * <p>Results mirror the Groovy patcher contract: {@code .installed} (completed), {@code .skipped}
 * (the script called {@code skip()}), {@code .failed} (the script threw). All results are terminal:
 * a recorded migration never re-runs, whatever its outcome. On {@code .failed}, the module's
 * remaining migrations are halted (they stay pending) but the module itself keeps starting —
 * failures never break module startup.
 *
 * <p>The {@code autoRun} configuration property (PID
 * {@code org.jahia.modules.javascript.modules.engine.migrations}, default {@code true}) can be set
 * to {@code false} on development/staging servers: pending migrations are then only logged, and
 * execution is deferred to an explicit trigger.
 */
@Component(service = Registrar.class, immediate = true,
        configurationPid = MigrationRegistrar.CONFIG_PID, configurationPolicy = ConfigurationPolicy.OPTIONAL)
public class MigrationRegistrar implements Registrar {

    public static final String REGISTRY_TYPE = "migration";
    public static final String CONFIG_PID = "org.jahia.modules.javascript.modules.engine.migrations";

    /** Pseudo-path prefix distinguishing JS migrations from Groovy patch entries in the shared status store. */
    public static final String STATUS_PATH_PREFIX = "/javascript/migrations/";

    public static final String RESULT_INSTALLED = ".installed";
    public static final String RESULT_SKIPPED = ".skipped";
    public static final String RESULT_FAILED = ".failed";

    private static final Logger logger = LoggerFactory.getLogger(MigrationRegistrar.class);

    protected GraalVMEngine graalVMEngine;
    private boolean autoRun = true;

    @Reference(cardinality = ReferenceCardinality.MANDATORY)
    public void setGraalVMEngine(GraalVMEngine graalVMEngine) {
        this.graalVMEngine = graalVMEngine;
    }

    @Activate
    @Modified
    public void activate(Map<String, ?> props) {
        Object value = props.get("autoRun");
        this.autoRun = value == null || Boolean.parseBoolean(value.toString());
    }

    @Override
    public void register(Bundle bundle) {
        try {
            if (!isProcessingServer()) {
                return;
            }
            List<Map<String, Object>> migrations = findMigrations(bundle);
            if (migrations.isEmpty()) {
                return;
            }
            migrations.sort(Comparator.comparing(entry -> String.valueOf(entry.get("name"))));

            String symbolicName = bundle.getSymbolicName();
            JSONObject status = getStatus(symbolicName);
            // A recorded failure is a persistent barrier: migrations ordered after the first
            // .failed one stay held (across restarts and redeploys) until that record is cleared
            // and the migration succeeds — otherwise later migrations would run on the next module
            // start even though an earlier one never completed.
            String failedBarrier = migrations.stream()
                    .map(entry -> String.valueOf(entry.get("name")))
                    .filter(name -> RESULT_FAILED.equals(status.optString(STATUS_PATH_PREFIX + name)))
                    .findFirst().orElse(null);
            List<Map<String, Object>> pending = migrations.stream()
                    .filter(entry -> !status.has(STATUS_PATH_PREFIX + entry.get("name")))
                    .filter(entry -> failedBarrier == null
                            || String.valueOf(entry.get("name")).compareTo(failedBarrier) < 0)
                    .collect(java.util.stream.Collectors.toList());
            if (failedBarrier != null) {
                long held = migrations.stream()
                        .filter(entry -> !status.has(STATUS_PATH_PREFIX + entry.get("name")))
                        .count() - pending.size();
                if (held > 0) {
                    logger.warn("Module {} has {} migration(s) held back behind failed migration {} — "
                            + "fix it and clear its record to let them run", symbolicName, held, failedBarrier);
                }
            }
            if (pending.isEmpty()) {
                logger.debug("No pending migration for module {}", symbolicName);
                return;
            }
            if (!autoRun) {
                logger.info("Module {} has {} pending migration(s) but autoRun is disabled — waiting for an explicit trigger",
                        symbolicName, pending.size());
                return;
            }

            logger.info("Running {} pending migration(s) for module {} {}", pending.size(), symbolicName,
                    bundle.getVersion());
            for (Map<String, Object> entry : pending) {
                String name = String.valueOf(entry.get("name"));
                long startTime = System.currentTimeMillis();
                String result = executeMigration(bundle, String.valueOf(entry.get("key")), name);
                status.put(STATUS_PATH_PREFIX + name, result);
                storeStatus(symbolicName, status);
                logger.info("Migration {} of module {} finished with result {} in {}ms", name, symbolicName,
                        result, System.currentTimeMillis() - startTime);
                if (RESULT_FAILED.equals(result)) {
                    logger.error("Migration {} of module {} failed — halting the module's remaining migrations "
                            + "(they stay pending). The module keeps starting.", name, symbolicName);
                    break;
                }
            }
        } catch (Exception e) {
            // Failures here must never prevent the module from starting
            logger.error("Unable to run migrations of bundle {}", bundle.getSymbolicName(), e);
        }
    }

    @Override
    public void unregister(Bundle bundle) {
        // nothing to tear down: migrations leave no live service behind
    }

    private List<Map<String, Object>> findMigrations(Bundle bundle) {
        return graalVMEngine.doWithContext(contextProvider -> {
            Map<String, Object> filter = new HashMap<>();
            filter.put("type", REGISTRY_TYPE);
            filter.put("bundleKey", bundle.getSymbolicName());
            return contextProvider.getRegistry().find(filter);
        });
    }

    /**
     * Executes one migration inside a GraalVM context, re-resolving the registry entry by key (JS
     * handles must not be cached outside a context). Returns the result string to record.
     * Protected as a seam for unit tests.
     */
    protected String executeMigration(Bundle bundle, String key, String name) {
        try {
            return graalVMEngine.doWithContext(contextProvider -> {
                Map<String, Object> entry = contextProvider.getRegistry().get(REGISTRY_TYPE, key);
                if (entry == null || entry.get("execute") == null) {
                    logger.error("Migration {} of module {} is no longer available in the registry",
                            name, bundle.getSymbolicName());
                    return RESULT_FAILED;
                }
                Value result = Value.asValue(entry.get("execute")).execute(newMigrationSupport(bundle));
                if (result != null && result.isString()) {
                    String resultString = result.asString();
                    if (RESULT_INSTALLED.equals(resultString) || RESULT_SKIPPED.equals(resultString)) {
                        return resultString;
                    }
                    logger.warn("Migration {} of module {} returned unexpected result '{}', recording {}",
                            name, bundle.getSymbolicName(), resultString, RESULT_INSTALLED);
                }
                return RESULT_INSTALLED;
            });
        } catch (Exception e) {
            logger.error("Migration {} of module {} threw an error", name, bundle.getSymbolicName(), e);
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

    protected MigrationSupport newMigrationSupport(Bundle bundle) {
        return new MigrationSupport(bundle, false);
    }
}
