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
package org.jahia.modules.javascript.modules.engine.sdk;

import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.Value;
import org.jahia.modules.javascript.modules.engine.jsengine.GraalVMException;
import org.junit.AfterClass;
import org.junit.BeforeClass;
import org.junit.Test;

import java.util.List;
import java.util.Map;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

public class JSServerExtensionInvokerImplTest {

    private static Context context;

    @BeforeClass
    public static void setUp() {
        context = Context.newBuilder("js").build();
    }

    @AfterClass
    public static void tearDown() {
        context.close();
    }

    private static Object invoke(String jsFunction, Object... args) {
        Value fn = context.eval("js", "(" + jsFunction + ")");
        return JSServerExtensionInvokerImpl.invoke(fn, args);
    }

    @Test
    public void convertsScalarsAndNull() {
        assertEquals(42L, invoke("() => 42"));
        assertEquals(2.5, invoke("() => 2.5"));
        assertEquals("hello", invoke("() => 'hello'"));
        assertEquals(true, invoke("() => true"));
        assertNull(invoke("() => null"));
        assertNull(invoke("() => undefined"));
    }

    @Test
    public void convertsObjectsAndArraysToPlainJava() {
        assertEquals(Map.of("valid", false, "message", "rejected!"),
                invoke("() => ({ valid: false, message: 'rejected!' })"));
        assertEquals(List.of(1L, "a"), invoke("() => [1, 'a']"));
    }

    @Test
    public void forwardsArguments() {
        assertEquals(3L, invoke("(a, b) => a + b", 1, 2));
    }

    @Test
    public void settlesAsyncCallables() {
        // an async callable is the default idiom in modern JS: its verdict must not be lost
        Object result = invoke("async () => ({ valid: false, message: 'rejected!' })");
        assertEquals(Map.of("valid", false, "message", "rejected!"), result);
    }

    @Test
    public void asyncRejectionsSurfaceAsRuntimeExceptions() {
        try {
            invoke("async () => { throw new Error('kaboom'); }");
            fail("expected a GraalVMException");
        } catch (GraalVMException e) {
            assertTrue(e.getMessage().contains("kaboom"));
        }
    }

    @Test
    public void synchronousThrowsSurfaceAsRuntimeExceptions() {
        try {
            invoke("() => { throw new Error('boom'); }");
            fail("expected a RuntimeException");
        } catch (RuntimeException e) {
            assertTrue(e.getMessage().contains("boom"));
        }
    }
}
