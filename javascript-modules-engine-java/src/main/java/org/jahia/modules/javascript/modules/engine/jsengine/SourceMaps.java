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

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.osgi.framework.Bundle;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Maps positions in a module's bundled server script back to the sources it was built from, so that
 * stack traces name the file a developer wrote rather than a line number in {@code index.js}.
 *
 * <p>Modules ship a standard <a href="https://tc39.es/ecma426/">source map</a> next to their server
 * bundle (the Vite plugin emits it by default). Maps are parsed on first use and dropped when the
 * module is unregistered.
 */
public class SourceMaps {

    private static final Logger logger = LoggerFactory.getLogger(SourceMaps.class);

    /**
     * A frame as GraalVM reports it, e.g. {@code my-module/dist/server/index.js:1234} or
     * {@code …index.js:1234:5}. The script name is the Graal source name, built by
     * {@link GraalVMEngine} as {@code <bundle>/<script>}.
     */
    private static final Pattern FRAME = Pattern.compile("([\\w.-]+)/(\\S+?\\.js):(\\d+)(?::(\\d+))?");

    /** Base64 alphabet used by the VLQ encoding of source map mappings. */
    private static final String BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    /** One mapping: a column in a generated line, and where it comes from. */
    private static final class Segment {
        private final int generatedColumn;
        private final String source;
        private final int sourceLine;

        private Segment(int generatedColumn, String source, int sourceLine) {
            this.generatedColumn = generatedColumn;
            this.source = source;
            this.sourceLine = sourceLine;
        }
    }

    /** Resolves a generated position to {@code <source>:<line>}; the seam unit tests replace. */
    @FunctionalInterface
    public interface PositionResolver {
        Optional<String> resolve(String bundleSymbolicName, String script, int line, Integer column);
    }

    /** A parsed source map: segments per generated line (0-based). */
    static final class ParsedMap {
        private final List<List<Segment>> lines;

        private ParsedMap(List<List<Segment>> lines) {
            this.lines = lines;
        }

        Optional<String> lookup(int generatedLine, Integer generatedColumn) {
            int index = generatedLine - 1;
            if (index < 0 || index >= lines.size()) {
                return Optional.empty();
            }
            List<Segment> segments = lines.get(index);
            if (segments.isEmpty()) {
                return Optional.empty();
            }
            // Without a column, or before the first mapping, the line's first mapping is the best guess
            Segment best = segments.get(0);
            if (generatedColumn != null) {
                for (Segment segment : segments) {
                    if (segment.generatedColumn > generatedColumn) {
                        break;
                    }
                    best = segment;
                }
            }
            return Optional.of(best.source + ":" + best.sourceLine);
        }
    }

    /** Parsed maps, keyed by Graal source name ({@code <bundle>/<script>}). Absent value = no usable map. */
    private final Map<String, Optional<ParsedMap>> maps = Collections.synchronizedMap(new HashMap<>());

    /** Script paths per bundle, so unregistering a module drops its maps. */
    private final Map<String, List<String>> scriptsByBundle = Collections.synchronizedMap(new HashMap<>());

    private final Map<String, Bundle> bundles = Collections.synchronizedMap(new HashMap<>());

    /** Tracks a module whose stack frames may need mapping. */
    public void register(Bundle bundle, String script) {
        bundles.put(bundle.getSymbolicName(), bundle);
        scriptsByBundle.computeIfAbsent(bundle.getSymbolicName(), key -> new ArrayList<>()).add(script);
        // a lookup racing a redeploy may have cached a negative entry while the bundle was absent —
        // evict it so the fresh map is read instead of staying unmapped until the next redeploy
        maps.remove(bundle.getSymbolicName() + "/" + script);
    }

    /** Forgets a module's maps, so a redeployed module is read again. */
    public void unregister(Bundle bundle) {
        String symbolicName = bundle.getSymbolicName();
        bundles.remove(symbolicName);
        List<String> scripts = scriptsByBundle.remove(symbolicName);
        if (scripts != null) {
            scripts.forEach(script -> maps.remove(symbolicName + "/" + script));
        }
    }

    /**
     * Rewrites every JavaScript frame of a stack trace to point at original sources, leaving anything
     * it cannot map untouched.
     *
     * @param stackTrace a stack trace (or any text) possibly containing generated-position frames
     * @return the same text with mapped positions substituted
     */
    public String rewrite(String stackTrace) {
        return rewrite(stackTrace, this::map);
    }

    /** Same as {@link #rewrite(String)}, against an explicit resolver. */
    public static String rewrite(String stackTrace, PositionResolver resolver) {
        if (stackTrace == null) {
            return null;
        }
        Matcher matcher = FRAME.matcher(stackTrace);
        StringBuffer result = new StringBuffer();
        while (matcher.find()) {
            String mapped;
            try {
                String bundle = matcher.group(1);
                String script = matcher.group(2);
                Integer column = matcher.group(4) == null ? null : Integer.valueOf(matcher.group(4));
                mapped = resolver.resolve(bundle, script, Integer.parseInt(matcher.group(3)), column)
                        .map(position -> bundle + "/" + position)
                        .orElseGet(matcher::group);
            } catch (RuntimeException e) {
                // mapping must never mask the error being reported (e.g. a position overflowing int)
                mapped = matcher.group();
            }
            matcher.appendReplacement(result, Matcher.quoteReplacement(mapped));
        }
        matcher.appendTail(result);
        return result.toString();
    }

    /**
     * Resolves one generated position.
     *
     * @return {@code <source>:<line>}, or empty when no map covers that position
     */
    public Optional<String> map(String bundleSymbolicName, String script, int line, Integer column) {
        return maps.computeIfAbsent(bundleSymbolicName + "/" + script,
                        key -> parse(bundleSymbolicName, script))
                .flatMap(parsed -> parsed.lookup(line, column));
    }

    private Optional<ParsedMap> parse(String bundleSymbolicName, String script) {
        Bundle bundle = bundles.get(bundleSymbolicName);
        if (bundle == null) {
            return Optional.empty();
        }
        String content = GraalVMEngine.loadResource(bundle, script + ".map");
        if (content == null) {
            logger.debug("No source map next to {}/{}, stack traces will point at the bundle", bundleSymbolicName,
                    script);
            return Optional.empty();
        }
        try {
            return Optional.of(parseMap(content));
        } catch (Exception e) {
            logger.warn("Ignoring unreadable source map for {}/{}", bundleSymbolicName, script, e);
            return Optional.empty();
        }
    }

    /** Parses a source map document. */
    static ParsedMap parseMap(String json) {
        try {
            return parseMappings(new ObjectMapper().readTree(json));
        } catch (Exception e) {
            throw new IllegalArgumentException("Unreadable source map", e);
        }
    }

    private static ParsedMap parseMappings(JsonNode map) {
        String sourceRoot = map.path("sourceRoot").asText("");
        // per the source map spec, sources are resolved relative to sourceRoot
        if (!sourceRoot.isEmpty() && !sourceRoot.endsWith("/")) {
            sourceRoot += "/";
        }
        List<String> sources = new ArrayList<>();
        for (JsonNode source : map.path("sources")) {
            sources.add(normalize(sourceRoot + source.asText()));
        }

        List<List<Segment>> lines = new ArrayList<>();
        int sourceIndex = 0;
        int sourceLine = 0;
        for (String group : map.path("mappings").asText("").split(";", -1)) {
            List<Segment> segments = new ArrayList<>();
            int generatedColumn = 0;
            for (String segment : group.split(",")) {
                if (segment.isEmpty()) {
                    continue;
                }
                int[] fields = decodeVlq(segment);
                // A single field only moves the generated column: no source position to record
                generatedColumn += fields[0];
                if (fields.length < 4) {
                    continue;
                }
                sourceIndex += fields[1];
                sourceLine += fields[2];
                if (sourceIndex >= 0 && sourceIndex < sources.size()) {
                    // Source maps count lines from 0, stack traces from 1
                    segments.add(new Segment(generatedColumn, sources.get(sourceIndex), sourceLine + 1));
                }
            }
            lines.add(segments);
        }
        return new ParsedMap(lines);
    }

    /** Turns a build-relative source path into something recognisable in a module's own tree. */
    private static String normalize(String source) {
        String normalized = source;
        while (normalized.startsWith("../")) {
            normalized = normalized.substring(3);
        }
        return normalized.startsWith("./") ? normalized.substring(2) : normalized;
    }

    /** Decodes one comma-separated segment: a list of Base64 VLQ-encoded, zigzag-signed deltas. */
    private static int[] decodeVlq(String segment) {
        List<Integer> values = new ArrayList<>(5);
        int value = 0;
        int shift = 0;
        for (int i = 0; i < segment.length(); i++) {
            int digit = BASE64.indexOf(segment.charAt(i));
            if (digit < 0) {
                throw new IllegalArgumentException("Invalid VLQ character: " + segment.charAt(i));
            }
            boolean hasContinuation = (digit & 32) != 0;
            value += (digit & 31) << shift;
            if (hasContinuation) {
                shift += 5;
            } else {
                // Least significant bit carries the sign
                values.add((value & 1) == 1 ? -(value >>> 1) : value >>> 1);
                value = 0;
                shift = 0;
            }
        }
        int[] fields = new int[values.size()];
        for (int i = 0; i < fields.length; i++) {
            fields[i] = values.get(i);
        }
        return fields;
    }
}
