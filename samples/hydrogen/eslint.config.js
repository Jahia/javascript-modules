// @ts-check
import { includeIgnoreFile } from "@eslint/compat";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import path from "node:path";
import globals from "globals";
import eslintReact from "@eslint-react/eslint-plugin";

/** Reference page describing what the Jahia server runtime does and does not provide. */
const SERVER_RUNTIME_BOUNDARY_DOCS =
  "https://github.com/Jahia/javascript-modules/blob/main/docs/3-reference/3-server-runtime-boundary/README.md";

/**
 * Globals that do not exist in the GraalJS runtime executing server files, keyed by the reason they
 * are missing.
 *
 * Every name here was verified to be `undefined` in a GraalJS 23.0.5 context configured like the
 * engine's. Names the runtime *does* provide (`console`, `Promise`, `Intl`, `Atomics`, and the
 * `TextEncoder`/`TextDecoder` polyfill installed by the engine) are intentionally absent from this
 * list.
 */
const serverRuntimeMissingGlobals = {
  "there is no event loop, only the microtask queue used by promises": [
    "setTimeout",
    "setInterval",
    "clearTimeout",
    "clearInterval",
    "setImmediate",
    "clearImmediate",
    "queueMicrotask",
  ],
  "the server runtime cannot perform asynchronous I/O": [
    "fetch",
    "XMLHttpRequest",
    "WebSocket",
    "EventSource",
    "Request",
    "Response",
    "Headers",
    "FormData",
    "Blob",
    "File",
    "FileReader",
    "AbortController",
    "AbortSignal",
  ],
  "the server runtime is not Node.js": [
    "process",
    "Buffer",
    "global",
    "require",
    "module",
    "exports",
    "__dirname",
    "__filename",
  ],
  "the server runtime is not a browser, move this code to a *.client.tsx island": [
    "window",
    "document",
    "navigator",
    "localStorage",
    "alert",
  ],
  "it is not part of ECMAScript and GraalJS does not provide it": [
    "URL",
    "URLSearchParams",
    "structuredClone",
    "crypto",
    "performance",
    "btoa",
    "atob",
  ],
};

/**
 * Node.js built-in module names, hardcoded as of Node 22. Server files can import none of them,
 * with or without the `node:` prefix.
 */
const nodeBuiltinModules = [
  "assert",
  "async_hooks",
  "buffer",
  "child_process",
  "cluster",
  "console",
  "constants",
  "crypto",
  "dgram",
  "diagnostics_channel",
  "dns",
  "domain",
  "events",
  "fs",
  "http",
  "http2",
  "https",
  "inspector",
  "module",
  "net",
  "os",
  "path",
  "perf_hooks",
  "process",
  "punycode",
  "querystring",
  "readline",
  "repl",
  "stream",
  "string_decoder",
  "sys",
  "timers",
  "tls",
  "trace_events",
  "tty",
  "url",
  "util",
  "v8",
  "vm",
  "wasi",
  "worker_threads",
  "zlib",
];

/**
 * Keeps APIs that only exist outside of the server runtime out of server files.
 *
 * Server files run in GraalJS, embedded in the Jahia JVM: plain ECMAScript, no event loop, no I/O,
 * no Node.js and no browser. Without this block, a `setTimeout` in a view or an action is only
 * discovered when the page renders, as `{"error":"setTimeout is not defined"}`.
 *
 * Client files (`*.client.tsx`) run in the browser and are deliberately left alone.
 *
 * Keep in sync with the copies in `eslint.config.js` (repository root),
 * `samples/hydrogen/eslint.config.js` and
 * `javascript-create-module/templates/module/eslint.config.js`.
 *
 * @see SERVER_RUNTIME_BOUNDARY_DOCS
 * @type {import("eslint").Linter.Config}
 */
const serverRuntimeBoundary = {
  files: ["**/*.server.{js,jsx,ts,tsx}", "**/*.action.{js,ts}"],
  rules: {
    "no-restricted-globals": [
      "error",
      ...Object.entries(serverRuntimeMissingGlobals).flatMap(([reason, names]) =>
        names.map((name) => ({
          name,
          message: `Not available in the Jahia server runtime: ${reason}. See ${SERVER_RUNTIME_BOUNDARY_DOCS}`,
        })),
      ),
    ],
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: [
              "node:*",
              "node:*/*",
              ...nodeBuiltinModules,
              ...nodeBuiltinModules.map((name) => `${name}/*`),
            ],
            message: `Node.js built-in modules are not available in the Jahia server runtime. See ${SERVER_RUNTIME_BOUNDARY_DOCS}`,
          },
        ],
      },
    ],
  },
};

/**
 * Keeps `async` out of the extension-point callbacks Jahia can invoke while JavaScript is already
 * running: a node validator reached by a save issued from server code, a render filter reached by a
 * `<Render>` component in a view. GraalJS drains the microtask queue only when the outermost
 * JavaScript frame returns to the host, so a promise created by such a nested call never settles,
 * and the save or the render fails with a promise that stays pending.
 *
 * Every file is linted, not only server files: these registrations are often declared in a plain
 * module imported by a server entry point.
 *
 * Keep in sync with the copies in `eslint.config.js` (repository root),
 * `samples/hydrogen/eslint.config.js` and
 * `javascript-create-module/templates/module/eslint.config.js`.
 *
 * @see SERVER_RUNTIME_BOUNDARY_DOCS
 * @type {import("eslint").Linter.Config}
 */
const synchronousExtensionCallbacks = {
  rules: {
    "no-restricted-syntax": [
      "error",
      ...["registerNodeValidator", "registerRenderFilter"].flatMap((name) => {
        const asyncFunction = ":matches(ArrowFunctionExpression, FunctionExpression)[async=true]";
        const message =
          `The callbacks of ${name}() must be synchronous: Jahia can invoke them while JavaScript ` +
          `is already running, where a promise never settles. See ${SERVER_RUNTIME_BOUNDARY_DOCS}`;
        return [
          // registerNodeValidator(declaration, async () => …)
          { selector: `CallExpression[callee.name="${name}"] > ${asyncFunction}`, message },
          // registerRenderFilter(declaration, { execute: async () => … })
          {
            selector: `CallExpression[callee.name="${name}"] Property > ${asyncFunction}`,
            message,
          },
        ];
      }),
    ],
  },
};

export default tseslint.config(
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },

  // JS/TS recommended
  eslint.configs.recommended,
  { files: ["**/*.ts", "**/*.tsx"], extends: tseslint.configs.recommended },

  // React
  eslintReact.configs["recommended-typescript"],

  // Server runtime boundary
  serverRuntimeBoundary,

  // Extension-point callbacks that cannot be async
  synchronousExtensionCallbacks,

  // Ignore the same files as .gitignore
  includeIgnoreFile(path.resolve(import.meta.dirname, ".gitignore")),
);
