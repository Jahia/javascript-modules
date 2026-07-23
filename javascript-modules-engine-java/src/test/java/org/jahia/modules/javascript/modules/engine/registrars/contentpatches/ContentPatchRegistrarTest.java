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

import org.jahia.modules.javascript.modules.engine.jsengine.GraalVMEngine;
import org.json.JSONObject;
import org.junit.Before;
import org.junit.Test;
import org.osgi.framework.Bundle;
import org.osgi.framework.Version;

import javax.jcr.RepositoryException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

import static org.jahia.modules.javascript.modules.engine.registrars.contentpatches.ContentPatchRegistrar.RESULT_FAILED;
import static org.jahia.modules.javascript.modules.engine.registrars.contentpatches.ContentPatchRegistrar.RESULT_INSTALLED;
import static org.jahia.modules.javascript.modules.engine.registrars.contentpatches.ContentPatchRegistrar.RESULT_SKIPPED;
import static org.jahia.modules.javascript.modules.engine.registrars.contentpatches.ContentPatchRegistrar.STATUS_PATH_PREFIX;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

public class ContentPatchRegistrarTest {

    private GraalVMEngine engine;
    private Bundle bundle;
    private TestableContentPatchRegistrar registrar;
    private List<Map<String, Object>> registryEntries;

    /** Overrides the JCR/JS seams: canned execution results, in-memory status store. */
    private static class TestableContentPatchRegistrar extends ContentPatchRegistrar {
        final Map<String, String> results = new HashMap<>();
        final List<String> executed = new ArrayList<>();
        final List<String> storeCalls = new ArrayList<>();
        JSONObject status = new JSONObject();
        boolean processingServer = true;
        boolean failOnGetStatus = false;

        @Override
        protected boolean isProcessingServer() {
            return processingServer;
        }

        @Override
        protected JSONObject getStatus(String symbolicName) throws RepositoryException {
            if (failOnGetStatus) {
                throw new RepositoryException("status store unavailable");
            }
            return status;
        }

        @Override
        protected void storeStatus(String symbolicName, JSONObject status) {
            storeCalls.add(status.toString());
        }

        @Override
        protected String executeContentPatch(Bundle bundle, String key, String name) {
            executed.add(name);
            return results.getOrDefault(name, RESULT_INSTALLED);
        }
    }

    @Before
    public void setUp() {
        engine = mock(GraalVMEngine.class);
        bundle = mock(Bundle.class);
        when(bundle.getSymbolicName()).thenReturn("test-bundle");
        when(bundle.getVersion()).thenReturn(new Version("2.0.0"));

        registryEntries = new ArrayList<>();
        when(engine.doWithContext(any(Function.class))).thenAnswer(invocation -> registryEntries);

        registrar = new TestableContentPatchRegistrar();
        registrar.setGraalVMEngine(engine);
        registrar.activate(Collections.emptyMap());
    }

    private Map<String, Object> patchEntry(String name) {
        Map<String, Object> entry = new HashMap<>();
        entry.put("type", ContentPatchRegistrar.REGISTRY_TYPE);
        entry.put("key", "test-bundle_content-patch_" + name);
        entry.put("bundleKey", "test-bundle");
        entry.put("name", name);
        return entry;
    }

    @Test
    public void runsPendingContentPatchsInNameOrderAndRecordsResults() {
        // registered out of order on purpose: execution must follow name order
        registryEntries.addAll(Arrays.asList(patchEntry("2.0.0-02-second"), patchEntry("2.0.0-01-first")));

        registrar.register(bundle);

        assertEquals(Arrays.asList("2.0.0-01-first", "2.0.0-02-second"), registrar.executed);
        assertEquals(RESULT_INSTALLED, registrar.status.getString(STATUS_PATH_PREFIX + "2.0.0-01-first"));
        assertEquals(RESULT_INSTALLED, registrar.status.getString(STATUS_PATH_PREFIX + "2.0.0-02-second"));
        // status persisted after each content patch, not only at the end
        assertEquals(2, registrar.storeCalls.size());
    }

    @Test
    public void alreadyRecordedContentPatchsNeverRunAgain() {
        registryEntries.addAll(Arrays.asList(patchEntry("2.0.0-01-first"), patchEntry("2.0.0-02-second")));
        registrar.status.put(STATUS_PATH_PREFIX + "2.0.0-01-first", RESULT_INSTALLED);

        registrar.register(bundle);

        assertEquals(Collections.singletonList("2.0.0-02-second"), registrar.executed);
    }

    @Test
    public void failedContentPatchsAreRecordedAsTerminal() {
        registryEntries.add(patchEntry("2.0.0-01-first"));
        registrar.status.put(STATUS_PATH_PREFIX + "2.0.0-01-first", RESULT_FAILED);

        registrar.register(bundle);

        assertTrue(registrar.executed.isEmpty());
    }

    @Test
    public void failureHaltsTheModulesRemainingContentPatchs() {
        registryEntries.addAll(Arrays.asList(patchEntry("2.0.0-01-first"), patchEntry("2.0.0-02-second")));
        registrar.results.put("2.0.0-01-first", RESULT_FAILED);

        registrar.register(bundle);

        assertEquals(Collections.singletonList("2.0.0-01-first"), registrar.executed);
        assertEquals(RESULT_FAILED, registrar.status.getString(STATUS_PATH_PREFIX + "2.0.0-01-first"));
        assertFalse(registrar.status.has(STATUS_PATH_PREFIX + "2.0.0-02-second"));
    }

    @Test
    public void recordedFailureIsAPersistentBarrierAcrossRestarts() {
        // simulates the NEXT module start after a failure: 01 is recorded .failed, 02 never ran
        registryEntries.addAll(Arrays.asList(patchEntry("2.0.0-01-first"), patchEntry("2.0.0-02-second")));
        registrar.status.put(STATUS_PATH_PREFIX + "2.0.0-01-first", RESULT_FAILED);

        registrar.register(bundle);

        assertTrue("02 must stay held behind the failed 01", registrar.executed.isEmpty());
        assertFalse(registrar.status.has(STATUS_PATH_PREFIX + "2.0.0-02-second"));
    }

    @Test
    public void clearingAFailedRecordReleasesTheHeldContentPatchs() {
        registryEntries.addAll(Arrays.asList(patchEntry("2.0.0-01-first"), patchEntry("2.0.0-02-second")));
        // the failed record was cleared (the documented recovery), 01 re-runs then 02 follows
        registrar.register(bundle);

        assertEquals(Arrays.asList("2.0.0-01-first", "2.0.0-02-second"), registrar.executed);
    }

    @Test
    public void skippedIsTerminalButDoesNotHalt() {
        registryEntries.addAll(Arrays.asList(patchEntry("2.0.0-01-first"), patchEntry("2.0.0-02-second")));
        registrar.results.put("2.0.0-01-first", RESULT_SKIPPED);

        registrar.register(bundle);

        assertEquals(Arrays.asList("2.0.0-01-first", "2.0.0-02-second"), registrar.executed);
        assertEquals(RESULT_SKIPPED, registrar.status.getString(STATUS_PATH_PREFIX + "2.0.0-01-first"));
    }

    @Test
    public void groovyPatchEntriesInTheSharedStoreAreLeftUntouched() {
        registryEntries.add(patchEntry("2.0.0-01-first"));
        registrar.status.put("/META-INF/patches/groovy/foo.started.groovy", ".installed");

        registrar.register(bundle);

        assertEquals(Collections.singletonList("2.0.0-01-first"), registrar.executed);
        assertEquals(".installed", registrar.status.getString("/META-INF/patches/groovy/foo.started.groovy"));
    }

    @Test
    public void autoRunDisabledLeavesContentPatchsPending() {
        Map<String, Object> props = new HashMap<>();
        props.put("autoRun", "false");
        registrar.activate(props);
        registryEntries.add(patchEntry("2.0.0-01-first"));

        registrar.register(bundle);

        assertTrue(registrar.executed.isEmpty());
        assertTrue(registrar.storeCalls.isEmpty());
    }

    @Test
    public void nonProcessingServersExecuteNothing() {
        registrar.processingServer = false;
        registryEntries.add(patchEntry("2.0.0-01-first"));

        registrar.register(bundle);

        assertTrue(registrar.executed.isEmpty());
    }

    @Test
    public void statusStoreErrorsNeverPreventModuleStart() {
        registrar.failOnGetStatus = true;
        registryEntries.add(patchEntry("2.0.0-01-first"));

        registrar.register(bundle); // must not throw

        assertTrue(registrar.executed.isEmpty());
    }

    @Test
    public void modulesWithoutContentPatchsAreANoOp() {
        registrar.register(bundle);

        assertTrue(registrar.executed.isEmpty());
        assertTrue(registrar.storeCalls.isEmpty());
    }
}
