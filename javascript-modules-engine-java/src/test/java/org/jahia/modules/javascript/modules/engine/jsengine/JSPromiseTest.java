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
package org.jahia.modules.javascript.modules.engine.jsengine;

import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.Value;
import org.junit.AfterClass;
import org.junit.BeforeClass;
import org.junit.Test;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

public class JSPromiseTest {

    private static Context context;

    @BeforeClass
    public static void setUp() {
        context = Context.newBuilder("js").build();
    }

    @AfterClass
    public static void tearDown() {
        context.close();
    }

    private static JSPromise.Outcome run(String jsFunction) {
        Value fn = context.eval("js", "(" + jsFunction + ")");
        return JSPromise.settle(fn.execute());
    }

    @Test
    public void settlesPlainValues() {
        JSPromise.Outcome settled = run("() => 42");
        assertTrue(settled.isSettled());
        assertFalse(settled.isRejected());
        assertEquals(42, settled.getValue().asInt());
    }

    @Test
    public void settlesAsyncFunctions() {
        JSPromise.Outcome settled = run("async () => 'hello'");
        assertTrue("async function result should settle at the API boundary", settled.isSettled());
        assertEquals("hello", settled.getValue().asString());
    }

    @Test
    public void settlesAwaitChains() {
        JSPromise.Outcome settled = run(
                "async () => { const a = await Promise.resolve(20); const b = await Promise.resolve(22); return a + b; }");
        assertTrue("awaited chains should settle through the microtask queue", settled.isSettled());
        assertEquals(42, settled.getValue().asInt());
    }

    @Test
    public void settlesThenChains() {
        JSPromise.Outcome settled = run(
                "() => Promise.resolve('a').then((v) => v + 'b').then((v) => v + 'c')");
        assertTrue(settled.isSettled());
        assertEquals("abc", settled.getValue().asString());
    }

    @Test
    public void capturesRejections() {
        JSPromise.Outcome settled = run("async () => { throw new Error('boom'); }");
        assertTrue(settled.isSettled());
        assertTrue(settled.isRejected());
        assertEquals("boom", settled.getError().getMember("message").asString());
    }

    @Test
    public void capturesRejectedPlainObjects() {
        JSPromise.Outcome settled = run(
                "() => Promise.reject({ message: 'invalid', issues: '[{\"message\":\"nope\"}]' })");
        assertTrue(settled.isSettled());
        assertTrue(settled.isRejected());
        assertEquals("invalid", settled.getError().getMember("message").asString());
        assertEquals("[{\"message\":\"nope\"}]", settled.getError().getMember("issues").asString());
    }

    @Test
    public void neverSettlingPromisesAreReportedAsNotDone() {
        JSPromise.Outcome settled = run("() => new Promise(() => {})");
        assertFalse(settled.isSettled());
    }

    @Test
    public void settleOrThrowReturnsFulfilledValues() {
        Value fn = context.eval("js", "(async () => 'done')");
        assertEquals("done", JSPromise.settleOrThrow(fn.execute(), "test callback").asString());
    }

    @Test
    public void settleOrThrowConvertsRejectionsIntoGraalVMExceptions() {
        Value fn = context.eval("js", "(async () => { throw new Error('kaboom'); })");
        try {
            JSPromise.settleOrThrow(fn.execute(), "test callback");
            fail("expected a GraalVMException");
        } catch (GraalVMException e) {
            assertTrue(e.getMessage().contains("test callback"));
            assertTrue(e.getMessage().contains("kaboom"));
        }
    }

    @Test
    public void settleOrThrowFailsExplicitlyOnNeverSettlingPromises() {
        Value fn = context.eval("js", "(() => new Promise(() => {}))");
        try {
            JSPromise.settleOrThrow(fn.execute(), "test callback");
            fail("expected a GraalVMException");
        } catch (GraalVMException e) {
            assertTrue(e.getMessage().contains("did not settle"));
        }
    }
}
