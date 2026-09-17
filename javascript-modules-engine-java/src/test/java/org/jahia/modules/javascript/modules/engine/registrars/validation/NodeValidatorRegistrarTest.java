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
package org.jahia.modules.javascript.modules.engine.registrars.validation;

import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.Value;
import org.jahia.modules.javascript.modules.engine.jsengine.GraalVMEngine;
import org.junit.AfterClass;
import org.junit.Before;
import org.junit.BeforeClass;
import org.junit.Test;
import org.osgi.framework.Bundle;

import java.lang.reflect.Constructor;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

public class NodeValidatorRegistrarTest {

    private static Context jsContext;

    private TestableRegistrar registrar;
    private List<Map<String, Object>> registryEntries;

    /** Registrar with the JCRStoreService interactions replaced by an in-memory state. */
    private static class TestableRegistrar extends NodeValidatorRegistrar {
        Constructor<?> platformValidator;
        int addCalls;
        int removeCalls;

        @Override
        protected Constructor<?> getRegisteredPlatformValidator() {
            return platformValidator;
        }

        @Override
        protected void addPlatformValidator() {
            addCalls++;
            platformValidator = JSNodeValidator.class.getConstructors()[0];
        }

        @Override
        protected void removePlatformValidator() {
            removeCalls++;
            platformValidator = null;
        }
    }

    @BeforeClass
    public static void setUpContext() {
        jsContext = Context.newBuilder("js").build();
    }

    @AfterClass
    public static void tearDownContext() {
        jsContext.close();
    }

    @Before
    @SuppressWarnings("unchecked")
    public void setUp() {
        GraalVMEngine engine = mock(GraalVMEngine.class);
        registryEntries = new ArrayList<>();
        when(engine.doWithContext(any(Function.class))).thenAnswer(invocation -> registryEntries);

        registrar = new TestableRegistrar();
        registrar.setGraalVMEngine(engine);
    }

    private Bundle bundle(String symbolicName) {
        Bundle bundle = mock(Bundle.class);
        when(bundle.getSymbolicName()).thenReturn(symbolicName);
        return bundle;
    }

    private Map<String, Object> entry(String key, String nodeType, boolean skipOnImport, boolean advanced) {
        Map<String, Object> entry = new HashMap<>();
        entry.put("type", "node-validator");
        entry.put("key", key);
        entry.put("nodeType", nodeType);
        entry.put("skipOnImport", skipOnImport);
        entry.put("advanced", advanced);
        return entry;
    }

    @Test
    public void bridgeIsRegisteredOnFirstValidatorAndRemovedWithTheLastOne() {
        Bundle bundleA = bundle("module-a");
        Bundle bundleB = bundle("module-b");

        registryEntries.add(entry("a", "jnt:a", false, false));
        registrar.register(bundleA);
        assertEquals(1, registrar.addCalls);

        registryEntries.clear();
        registryEntries.add(entry("b", "jnt:b", false, false));
        registrar.register(bundleB);
        // still a single platform registration
        assertEquals(1, registrar.addCalls);

        registrar.unregister(bundleA);
        assertEquals(0, registrar.removeCalls);

        registrar.unregister(bundleB);
        assertEquals(1, registrar.removeCalls);
        assertNull(registrar.platformValidator);
    }

    @Test
    public void bundlesWithoutValidatorsDoNotRegisterTheBridge() {
        registrar.register(bundle("module-without-validators"));
        assertEquals(0, registrar.addCalls);
    }

    @Test
    public void aForeignPlatformValidatorIsNeverRemoved() throws Exception {
        // simulate another module having clobbered the sentinel registration
        registryEntries.add(entry("a", "jnt:a", false, false));
        Bundle bundleA = bundle("module-a");
        registrar.register(bundleA);

        Constructor<?> foreign = String.class.getConstructor();
        registrar.platformValidator = foreign;

        registrar.unregister(bundleA);
        assertEquals(0, registrar.removeCalls);
        assertEquals(foreign, registrar.platformValidator);
    }

    @Test
    public void deactivateCleansUp() {
        registryEntries.add(entry("a", "jnt:a", false, false));
        registrar.register(bundle("module-a"));

        registrar.deactivate();
        assertEquals(1, registrar.removeCalls);
    }

    @Test
    public void modesAreDerivedFromTheDeclarationFlags() {
        assertEquals(JSValidation.Mode.DEFAULT, NodeValidatorRegistrar.modeOf(entry("k", "t", false, false)));
        assertEquals(JSValidation.Mode.DEFAULT_SKIP_ON_IMPORT, NodeValidatorRegistrar.modeOf(entry("k", "t", true, false)));
        assertEquals(JSValidation.Mode.ADVANCED, NodeValidatorRegistrar.modeOf(entry("k", "t", false, true)));
        assertEquals(JSValidation.Mode.ADVANCED_SKIP_ON_IMPORT, NodeValidatorRegistrar.modeOf(entry("k", "t", true, true)));
    }

    @Test
    public void violationResultsAcceptAllDocumentedShapes() {
        List<JSViolation> violations = new ArrayList<>();

        NodeValidatorRegistrar.appendViolations(violations, jsContext.eval("js", "undefined"), "test");
        NodeValidatorRegistrar.appendViolations(violations, jsContext.eval("js", "null"), "test");
        assertTrue(violations.isEmpty());

        NodeValidatorRegistrar.appendViolations(violations,
                jsContext.eval("js", "({message: 'single', propertyName: 'email'})"), "test");
        assertEquals(1, violations.size());
        assertEquals("single", violations.get(0).getMessage());
        assertEquals("email", violations.get(0).getPropertyName());

        NodeValidatorRegistrar.appendViolations(violations,
                jsContext.eval("js", "[{message: 'first'}, {message: 'second', propertyName: 'score'}]"), "test");
        assertEquals(3, violations.size());
        assertNull(violations.get(1).getPropertyName());
        assertEquals("score", violations.get(2).getPropertyName());

        // malformed items (no string message) are skipped
        NodeValidatorRegistrar.appendViolations(violations,
                jsContext.eval("js", "[{propertyName: 'email'}, {message: 42}, 'not-an-object']"), "test");
        assertEquals(3, violations.size());
    }

    @Test
    public void collectViolationsReturnsNothingWhenNoTypeMatchesTheMode() {
        // no snapshot at all: the gate short-circuits before touching the engine
        assertTrue(registrar.collectViolations(null, JSValidation.Mode.DEFAULT).isEmpty());
    }

    @Test
    public void violationOfMissingMessageStringIsSkipped() {
        List<JSViolation> violations = new ArrayList<>();
        Value item = jsContext.eval("js", "({message: null})");
        NodeValidatorRegistrar.appendViolations(violations, item, "test");
        assertFalse(violations.stream().anyMatch(v -> v.getValidatorKey().equals("missing")));
        assertTrue(violations.isEmpty());
    }
}
