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
package org.jahia.modules.javascript.modules.engine.views;

import org.jahia.modules.javascript.modules.engine.jsengine.SourceMaps;
import org.junit.Test;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

public class ViewRenderErrorTest {

    @Test
    public void GIVEN_markup_in_the_error_WHEN_rendering_the_box_THEN_it_is_escaped() {
        String html = ViewRenderError.render("mymodule:banner/default",
                new RuntimeException("<script>alert('xss')</script> & \"quotes\""), new SourceMaps());

        assertFalse("raw markup from the error must not reach the page", html.contains("<script>"));
        assertTrue(html.contains("&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt; &amp; &quot;quotes&quot;"));
    }

    @Test
    public void GIVEN_markup_in_the_view_key_WHEN_rendering_the_box_THEN_it_is_escaped() {
        String html = ViewRenderError.render("<img src=x onerror=alert(1)>",
                new RuntimeException("boom"), new SourceMaps());

        assertFalse(html.contains("<img"));
        assertTrue(html.contains("&lt;img src=x onerror=alert(1)&gt;"));
    }

    @Test
    public void GIVEN_a_wrapped_error_WHEN_rendering_the_box_THEN_the_innermost_message_is_shown() {
        String html = ViewRenderError.render("mymodule:banner/default",
                new RuntimeException("wrapper", new IllegalStateException("the real reason")),
                new SourceMaps());

        assertTrue(html.contains("the real reason"));
    }

    @Test
    public void GIVEN_an_error_without_message_WHEN_rendering_the_box_THEN_its_class_name_is_shown() {
        String html = ViewRenderError.render("mymodule:banner/default",
                new IllegalStateException((String) null), new SourceMaps());

        assertTrue(html.contains("java.lang.IllegalStateException"));
    }
}
