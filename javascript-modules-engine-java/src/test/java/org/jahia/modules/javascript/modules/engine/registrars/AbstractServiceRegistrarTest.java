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
package org.jahia.modules.javascript.modules.engine.registrars;

import org.jahia.modules.javascript.modules.engine.jsengine.GraalVMEngine;
import org.junit.Before;
import org.junit.Test;
import org.osgi.framework.Bundle;
import org.osgi.framework.BundleContext;
import org.osgi.framework.ServiceRegistration;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class AbstractServiceRegistrarTest {

    private GraalVMEngine engine;
    private BundleContext bundleContext;
    private Bundle bundle;
    private TestRegistrar registrar;
    private List<Map<String, Object>> registryEntries;

    /** Minimal concrete registrar bridging entries to plain Runnable services. */
    private static class TestRegistrar extends AbstractServiceRegistrar<Runnable> {
        List<Map<String, Object>> beforeRegisterCalls = new ArrayList<>();
        String failingKey;

        TestRegistrar() {
            super(Runnable.class, "test-type");
        }

        @Override
        protected Runnable createBridge(Map<String, Object> registryEntry) {
            if (registryEntry.get("key").equals(failingKey)) {
                throw new IllegalStateException("bridge creation failed for " + failingKey);
            }
            return () -> {
            };
        }

        @Override
        protected void beforeRegister(Bundle bundle, Map<String, Object> registryEntry) {
            beforeRegisterCalls.add(registryEntry);
        }
    }

    @Before
    public void setUp() {
        engine = mock(GraalVMEngine.class);
        bundleContext = mock(BundleContext.class);
        bundle = mock(Bundle.class);
        when(bundle.getSymbolicName()).thenReturn("test-bundle");

        registryEntries = new ArrayList<>();
        // the registrar reads entries through doWithContext; short-circuit the context here
        when(engine.doWithContext(any(Function.class))).thenAnswer(invocation -> registryEntries);

        registrar = new TestRegistrar();
        registrar.graalVMEngine = engine;
        registrar.bundleContext = bundleContext;
    }

    private Map<String, Object> entry(String key) {
        Map<String, Object> entry = new HashMap<>();
        entry.put("type", "test-type");
        entry.put("key", key);
        entry.put("bundleKey", "test-bundle");
        return entry;
    }

    /** Every registerService call returns a fresh mock, collected for later verification. */
    @SuppressWarnings("unchecked")
    private List<ServiceRegistration<Runnable>> stubRegistrations() {
        List<ServiceRegistration<Runnable>> created = new ArrayList<>();
        when(bundleContext.registerService(eq(Runnable.class), any(Runnable.class), any())).thenAnswer(invocation -> {
            ServiceRegistration<Runnable> registration = mock(ServiceRegistration.class);
            created.add(registration);
            return registration;
        });
        return created;
    }

    @Test
    public void registerPublishesOneServicePerEntryAndUnregisterReleasesThem() {
        registryEntries.addAll(Arrays.asList(entry("a"), entry("b")));
        List<ServiceRegistration<Runnable>> registrations = stubRegistrations();

        registrar.register(bundle);
        verify(bundleContext, times(2)).registerService(eq(Runnable.class), any(Runnable.class), any());
        assertEquals(2, registrar.beforeRegisterCalls.size());

        registrar.unregister(bundle);
        assertEquals(2, registrations.size());
        for (ServiceRegistration<Runnable> registration : registrations) {
            verify(registration).unregister();
        }
    }

    @Test
    public void aFailingBridgeDoesNotPreventOtherEntriesFromRegistering() {
        registryEntries.addAll(Arrays.asList(entry("a"), entry("broken"), entry("c")));
        registrar.failingKey = "broken";
        stubRegistrations();

        registrar.register(bundle);

        verify(bundleContext, times(2)).registerService(eq(Runnable.class), any(Runnable.class), any());
    }

    @Test
    public void unregisterUnknownBundleIsANoOp() {
        registrar.unregister(bundle);
        verify(bundleContext, never()).registerService(eq(Runnable.class), any(Runnable.class), any());
    }

    @Test
    public void unregisterSurvivesAFailingServiceUnregistration() {
        registryEntries.addAll(Arrays.asList(entry("a"), entry("b")));
        List<ServiceRegistration<Runnable>> registrations = stubRegistrations();

        registrar.register(bundle);
        assertEquals(2, registrations.size());
        doThrow(new IllegalStateException("already unregistered")).when(registrations.get(0)).unregister();

        registrar.unregister(bundle);

        // both unregistrations attempted despite one of them throwing
        for (ServiceRegistration<Runnable> registration : registrations) {
            verify(registration).unregister();
        }
    }

    @Test
    public void registryTypeIsExposed() {
        assertTrue(registrar.getRegistryType().equals("test-type"));
    }
}
