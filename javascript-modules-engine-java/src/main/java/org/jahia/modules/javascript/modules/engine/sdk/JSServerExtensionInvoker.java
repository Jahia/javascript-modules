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

import java.util.List;
import java.util.Map;

/**
 * Public SDK entry point letting <strong>other OSGi bundles</strong> consume JavaScript-declared server
 * extensions registered via {@code server.registry.add(type, key, entry)} in JS modules — without any
 * dependency on GraalVM/polyglot types or on the engine internals.
 *
 * <p>This is the supported extension surface for modules (such as Formidable) that define their own
 * server-side extension type and need to run the JS callbacks contributed against it. It complements the
 * built-in registrars ({@code node-validator}, {@code action}, …), which wire JS entries to Jahia's own
 * extension points; here the <em>consumer</em> owns the extension point.
 *
 * <p>All work happens inside a single pooled GraalVM context for the duration of one {@link #forEach}
 * call. GraalVM values (the JS callables stored in entries) are only valid during that call, so callables
 * must be invoked through the {@link Invoker} passed to the handler, never captured for later use.
 */
public interface JSServerExtensionInvoker {

    /**
     * Iterates all registry entries of {@code registryType} (across every deployed JS module) within one
     * JS context, invoking {@code handler} for each. Results that are non-null are collected and returned
     * in registry order.
     *
     * <p>The handler receives the entry as a plain {@code Map<String,Object>} (scalar fields such as
     * {@code nodeType} are plain Java; function fields are opaque handles to pass to the {@link Invoker}).
     * A handler exception propagates to the caller — callers that need fail-closed semantics should catch
     * their own errors inside the handler and translate them into a result.
     *
     * @param registryType the JS registry type to look up (e.g. {@code "formidable-field-validator"})
     * @param handler      invoked once per matching entry; return {@code null} to skip an entry
     * @param <T>          the result type accumulated across entries
     * @return the non-null handler results, in registry order (never {@code null})
     */
    <T> List<T> forEach(String registryType, ExtensionHandler<T> handler);

    /** Handles a single registry entry, optionally invoking its JS callables through {@code invoker}. */
    @FunctionalInterface
    interface ExtensionHandler<T> {
        T handle(Map<String, Object> entry, Invoker invoker);
    }

    /** Invokes a JS callable stored in a registry entry and converts its result to plain Java. */
    @FunctionalInterface
    interface Invoker {
        /**
         * Executes {@code callable} (a function field read from an entry) with {@code args} and returns
         * the result converted to plain Java: {@code null}, {@link Boolean}, {@link Long}/{@link Double},
         * {@link String}, {@link List}, or {@link Map}. Host objects passed as arguments (e.g. a
         * {@code JCRNodeWrapper}) are forwarded to JS as-is.
         *
         * <p>Async callables are settled synchronously: a returned promise resolves through the microtask
         * queue (any composition of {@code async}/{@code await} over synchronous work — no timers or async
         * I/O), its rejection surfaces as a {@link RuntimeException}, exactly like a synchronous throw.
         * This requires the {@link #forEach} call to be host-initiated: invoked from inside a running JS
         * execution (a view render, a JS-triggered save), a promise cannot settle and the call fails.
         *
         * @throws RuntimeException if the callable is not executable, throws, or returns a promise that
         *         cannot settle
         */
        Object call(Object callable, Object... args);
    }
}
