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

import "./init-i18next.js";
import "./init-react.js";
import "./init-url-builder.js";
