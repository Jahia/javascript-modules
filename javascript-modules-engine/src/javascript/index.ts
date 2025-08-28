/**
 * This module is meant to run once when the JSM is initializing. It only contains side effects:
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

import { initUrlBuilder } from "@jahia/javascript-modules-library";

initUrlBuilder();
