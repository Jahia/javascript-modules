/**
 * This module is meant to run once when the JSM engine is initializing. It only contains side
 * effects:
 *
 * - Register a `TextEncoder` polyfill
 * - Initialize i18next
 * - Initialize a React view renderer
 * - Initialize `buildNodeUrl` under lying url builders
 *
 * @module
 */

import "fast-text-encoding"; // Required until Graal exposes TextEncoder
import "web-streams-polyfill/polyfill"; // Required until Graal exposes ReadableStream
// @ts-expect-error Polyfill setTimeout because it's not available in GraalVM, and React requires it
globalThis.setTimeout = (fn, ms, ...args) => Promise.resolve().then(() => fn(...args));

import "./init-i18next.js";
import "./init-react.js";
import "./init-url-builder.js";
