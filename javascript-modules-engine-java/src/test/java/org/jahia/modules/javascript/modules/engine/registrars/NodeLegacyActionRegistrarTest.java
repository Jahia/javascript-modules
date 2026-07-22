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

import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.Value;
import org.jahia.bin.ActionResult;
import org.junit.AfterClass;
import org.junit.BeforeClass;
import org.junit.Test;

import java.util.HashMap;
import java.util.Map;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

public class NodeLegacyActionRegistrarTest {

    private static Context context;

    @BeforeClass
    public static void setUp() {
        context = Context.newBuilder("js").build();
    }

    @AfterClass
    public static void tearDown() {
        context.close();
    }

    private static ActionResult convert(String jsExpression) {
        Value result = context.eval("js", jsExpression);
        return NodeLegacyActionRegistrar.ActionBridge.convertResult(result);
    }

    @Test
    public void declarationIsMappedOntoTheActionBaseClass() {
        Map<String, Object> entry = new HashMap<>();
        entry.put("key", "myAction");
        entry.put("requiredMethods", "GET,POST");
        entry.put("requireAuthenticatedUser", Boolean.TRUE);
        entry.put("requiredPermission", "jcr:write");
        entry.put("requiredWorkspace", "live");

        NodeLegacyActionRegistrar.ActionBridge bridge = new NodeLegacyActionRegistrar.ActionBridge(entry, null);

        assertEquals("myAction", bridge.getName());
        assertTrue(bridge.getRequiredMethods().contains("GET"));
        assertTrue(bridge.getRequiredMethods().contains("POST"));
        assertTrue(bridge.isRequireAuthenticatedUser());
        assertEquals("jcr:write", bridge.getRequiredPermission());
        assertEquals("live", bridge.getRequiredWorkspace());
    }

    @Test
    public void absentDeclarationKeysKeepBaseClassDefaults() {
        Map<String, Object> entry = new HashMap<>();
        entry.put("key", "minimalAction");

        NodeLegacyActionRegistrar.ActionBridge bridge = new NodeLegacyActionRegistrar.ActionBridge(entry, null);

        assertEquals("minimalAction", bridge.getName());
        // Jahia's Action base class requires an authenticated user by default
        assertTrue(bridge.isRequireAuthenticatedUser());
        assertNull(bridge.getRequiredPermission());
    }

    @Test
    public void convertsAFullResult() {
        ActionResult result = convert(
                "({statusCode: 201, json: JSON.stringify({message: 'ok', nested: {list: [1, 2]}}), " +
                        "redirect: '/somewhere', absoluteRedirect: true})");

        assertEquals(201, result.getResultCode());
        assertEquals("/somewhere", result.getUrl());
        assertTrue(result.isAbsoluteUrl());
        assertEquals("ok", result.getJson().getString("message"));
        assertEquals(2, result.getJson().getJSONObject("nested").getJSONArray("list").length());
    }

    @Test
    public void defaultsToHttp200() {
        ActionResult result = convert("({})");
        assertEquals(200, result.getResultCode());
        assertNull(result.getUrl());
        assertFalse(result.isAbsoluteUrl());
        assertNull(result.getJson());
    }

    @Test
    public void nullAndUndefinedResultsYieldAnEmpty200() {
        assertEquals(200, convert("null").getResultCode());
        assertEquals(200, convert("undefined").getResultCode());
    }
}
