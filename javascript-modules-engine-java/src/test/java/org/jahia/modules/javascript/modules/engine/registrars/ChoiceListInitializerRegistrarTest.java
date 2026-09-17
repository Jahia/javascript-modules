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
import org.jahia.services.content.nodetypes.initializers.ChoiceListValue;
import org.junit.AfterClass;
import org.junit.BeforeClass;
import org.junit.Test;

import javax.jcr.RepositoryException;
import java.util.List;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

public class ChoiceListInitializerRegistrarTest {

    private static Context context;

    @BeforeClass
    public static void setUp() {
        context = Context.newBuilder("js").build();
    }

    @AfterClass
    public static void tearDown() {
        context.close();
    }

    private static List<ChoiceListValue> convert(String jsExpression) {
        Value result = context.eval("js", jsExpression);
        return ChoiceListInitializerRegistrar.ChoiceListInitializerBridge.convertValues(result, "test");
    }

    @Test
    public void convertsLabelValuePairs() throws RepositoryException {
        List<ChoiceListValue> values = convert("[{label: 'Red', value: 'red'}, {label: 'Green', value: 'green'}]");

        assertEquals(2, values.size());
        assertEquals("Red", values.get(0).getDisplayName());
        assertEquals("red", values.get(0).getValue().getString());
        assertNull(values.get(0).getProperties());
        assertEquals("Green", values.get(1).getDisplayName());
    }

    @Test
    public void convertsProperties() throws RepositoryException {
        List<ChoiceListValue> values = convert(
                "[{label: 'Blue', value: 'blue', properties: {defaultProperty: true, image: '/img.png'}}]");

        assertEquals(1, values.size());
        assertEquals("Blue", values.get(0).getDisplayName());
        assertEquals("blue", values.get(0).getValue().getString());
        assertEquals(Boolean.TRUE, values.get(0).getProperties().get("defaultProperty"));
        assertEquals("/img.png", values.get(0).getProperties().get("image"));
    }

    @Test
    public void skipsMalformedItems() {
        List<ChoiceListValue> values = convert(
                "[{label: 'ok', value: 'ok'}, {label: 'missing value'}, {value: 'missing label'}, {}]");

        assertEquals(1, values.size());
        assertEquals("ok", values.get(0).getDisplayName());
    }

    @Test
    public void nonArrayResultsYieldNoValues() {
        assertTrue(convert("null").isEmpty());
        assertTrue(convert("undefined").isEmpty());
        assertTrue(convert("({label: 'not-an-array', value: 'x'})").isEmpty());
        assertTrue(convert("[]").isEmpty());
    }
}
