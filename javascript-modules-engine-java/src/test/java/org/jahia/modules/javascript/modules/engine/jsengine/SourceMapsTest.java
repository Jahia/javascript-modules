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

import org.junit.Test;

import java.util.Optional;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;

public class SourceMapsTest {

    /**
     * A source map as a bundler emits one, holding three mappings:
     *
     * <ul>
     *   <li>generated 1:0 → {@code src/components/Blog/default.server.tsx} line 10
     *   <li>generated 1:20 → the same file, line 41
     *   <li>generated 3:0 → {@code src/lib/helper.ts} line 6
     * </ul>
     *
     * Generated line 2 is deliberately left without any mapping.
     */
    private static final String MAP = "{\n"
            + "  \"version\": 3,\n"
            + "  \"file\": \"index.js\",\n"
            + "  \"sources\": [\n"
            + "    \"../../src/components/Blog/default.server.tsx\",\n"
            + "    \"../../src/lib/helper.ts\"\n"
            + "  ],\n"
            + "  \"names\": [],\n"
            + "  \"mappings\": \"AASA,oBA+BE;;ACnCA\"\n"
            + "}";

    @Test
    public void GIVEN_a_mapped_position_WHEN_looking_it_up_THEN_the_original_source_and_line_are_returned() {
        assertEquals(Optional.of("src/components/Blog/default.server.tsx:10"),
                SourceMaps.parseMap(MAP).lookup(1, 0));
    }

    @Test
    public void GIVEN_a_column_past_a_mapping_WHEN_looking_it_up_THEN_the_nearest_earlier_mapping_wins() {
        assertEquals(Optional.of("src/components/Blog/default.server.tsx:41"),
                SourceMaps.parseMap(MAP).lookup(1, 25));
    }

    @Test
    public void GIVEN_no_column_WHEN_looking_up_a_line_THEN_its_first_mapping_is_used() {
        assertEquals(Optional.of("src/components/Blog/default.server.tsx:10"),
                SourceMaps.parseMap(MAP).lookup(1, null));
    }

    @Test
    public void GIVEN_a_later_line_WHEN_looking_it_up_THEN_source_and_line_deltas_are_accumulated() {
        assertEquals(Optional.of("src/lib/helper.ts:6"), SourceMaps.parseMap(MAP).lookup(3, 0));
    }

    @Test
    public void GIVEN_a_line_without_mapping_WHEN_looking_it_up_THEN_nothing_is_returned() {
        assertFalse(SourceMaps.parseMap(MAP).lookup(2, 0).isPresent());
    }

    @Test
    public void GIVEN_a_line_outside_the_map_WHEN_looking_it_up_THEN_nothing_is_returned() {
        assertFalse(SourceMaps.parseMap(MAP).lookup(9999, 0).isPresent());
    }

    @Test
    public void GIVEN_a_stack_trace_WHEN_rewriting_it_THEN_mapped_frames_point_at_module_sources() {
        String stackTrace = "org.graalvm.polyglot.PolyglotException: Error: boom\n"
                + "\tat <js>.render(my-module/dist/server/index.js:3937)\n"
                + "\tat <js>.:=>(my-module/dist/server/index.js:118:12)\n"
                + "\tat org.jahia.services.render.RenderService.render(RenderService.java:182)\n";

        String rewritten = SourceMaps.rewrite(stackTrace,
                (bundle, script, line, column) -> Optional.of("src/components/Blog/default.server.tsx:" + line));

        assertEquals("org.graalvm.polyglot.PolyglotException: Error: boom\n"
                + "\tat <js>.render(my-module/src/components/Blog/default.server.tsx:3937)\n"
                + "\tat <js>.:=>(my-module/src/components/Blog/default.server.tsx:118)\n"
                // Java frames are left alone
                + "\tat org.jahia.services.render.RenderService.render(RenderService.java:182)\n", rewritten);
    }

    @Test
    public void GIVEN_a_frame_without_a_map_WHEN_rewriting_it_THEN_it_is_left_untouched() {
        String stackTrace = "\tat <js>.render(my-module/dist/server/index.js:3937)\n";
        assertEquals(stackTrace, SourceMaps.rewrite(stackTrace,
                (bundle, script, line, column) -> Optional.empty()));
    }

    @Test
    public void GIVEN_an_unregistered_bundle_WHEN_mapping_a_position_THEN_nothing_is_returned() {
        assertFalse(new SourceMaps().map("never-registered", "dist/server/index.js", 1, 0).isPresent());
    }
}
