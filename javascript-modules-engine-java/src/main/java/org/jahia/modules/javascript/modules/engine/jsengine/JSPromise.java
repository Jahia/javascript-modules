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

import org.graalvm.polyglot.Value;
import org.graalvm.polyglot.proxy.ProxyExecutable;

/**
 * Settles a JS value that may be a promise, synchronously.
 *
 * <p>The server-side JS runtime has no event loop, timers or asynchronous I/O: every promise either
 * settles through the microtask queue — which GraalJS drains when the last JavaScript frame returns to
 * the host — or never settles at all. Attaching the {@code then} handlers is itself a polyglot call, so
 * by the time it returns, microtask-resolvable chains (any composition of {@code async}/{@code await}
 * and {@code Promise.resolve}/{@code then} over synchronous work) have run to completion.
 */
public final class JSPromise {

    private JSPromise() {
    }

    /** Outcome of settling a JS value. */
    public static final class Outcome {
        private final Value value;
        private final Value error;
        private final boolean settled;

        private Outcome(Value value, Value error, boolean settled) {
            this.value = value;
            this.error = error;
            this.settled = settled;
        }

        public boolean isSettled() {
            return settled;
        }

        public boolean isRejected() {
            return error != null;
        }

        public Value getValue() {
            return value;
        }

        public Value getError() {
            return error;
        }
    }

    public static Outcome settle(Value result) {
        if (result == null || !isThenable(result)) {
            return new Outcome(result, null, true);
        }
        final Value[] outcome = new Value[2];
        final boolean[] done = new boolean[1];
        result.invokeMember("then",
                (ProxyExecutable) arguments -> {
                    outcome[0] = arguments.length > 0 ? arguments[0] : null;
                    done[0] = true;
                    return null;
                },
                (ProxyExecutable) arguments -> {
                    // a bare reject() carries no reason; substitute a readable one
                    outcome[1] = arguments.length > 0 ? arguments[0] : Value.asValue("unknown error");
                    done[0] = true;
                    return null;
                });
        // the microtask queue is drained when invokeMember returns to the host
        return new Outcome(outcome[0], outcome[1], done[0]);
    }

    /**
     * Settles a JS value and returns the fulfilled result, converting the two failure modes into a
     * {@link GraalVMException}: a rejection behaves like a synchronous throw (same as a non-async
     * callback throwing), and a never-settling promise fails with an explicit explanation.
     *
     * @param result the value returned by a JS callback (plain value or promise)
     * @param what describes the callback for error messages, e.g. {@code "JS render filter 'x'"}
     */
    public static Value settleOrThrow(Value result, String what) {
        Outcome outcome = settle(result);
        if (!outcome.isSettled()) {
            throw new GraalVMException(what + " returned a promise that did not settle; only microtask-based " +
                    "asynchronicity is supported on the server (no timers or async I/O)");
        }
        if (outcome.isRejected()) {
            throw new GraalVMException(what + " failed: " + messageOf(outcome.getError()));
        }
        return outcome.getValue();
    }

    private static String messageOf(Value errorValue) {
        if (errorValue == null) {
            return "unknown error";
        }
        if (errorValue.hasMembers() && errorValue.hasMember("message")) {
            Value message = errorValue.getMember("message");
            if (message != null && message.isString()) {
                return message.asString();
            }
        }
        return errorValue.toString();
    }

    private static boolean isThenable(Value value) {
        return value.hasMembers() && value.hasMember("then") && value.getMember("then").canExecute();
    }
}
