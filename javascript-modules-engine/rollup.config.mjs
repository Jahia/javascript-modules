// @ts-check
import commonJs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import replace from "@rollup/plugin-replace";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import { fileURLToPath } from "node:url";
import { defineConfig } from "rollup";
import sbom from "rollup-plugin-sbom";
import sharedLibs from "./shared-libs.mjs";

/**
 * The build environment is either "development" or "production".
 *
 * It comes from the --environment BUILD:... flag in the build command.
 */
const buildEnv = process.env.BUILD || "development";

/**
 * List of files generated during the shared client libs build (2nd phase).
 *
 * This list is then re-injected in the server-side build (3rd phase) to add performance
 * optimizations to `<InBrowser />`.
 *
 * The goal of all this is to flatten the network dependency graph of the hydrated code, by using
 * `<link rel="modulepreload" />` hints.
 *
 * @type {string[]}
 */
let sharedLibFiles;

/**
 * Rollup plugins common to all builds.
 *
 * @type {import("rollup").InputPluginOption[]}
 */
const plugins = [
  commonJs(),
  nodeResolve(),
  replace({
    values: {
      "process.env.NODE_ENV": JSON.stringify(buildEnv),
    },
    preventAssignment: true,
  }),
  typescript(),
  sbom({ specVersion: "1.4" }),
];

export default defineConfig([
  // Build the main client-side script
  // It takes care of hydrating server-side rendered components
  {
    input: "./src/client-javascript/index.ts",
    output: {
      file: "src/main/resources/javascript/index.js",
    },
    external: Object.keys(sharedLibs),
    plugins: [
      ...plugins,
      // Minify client files in production
      buildEnv === "production" && terser(),
    ],
  },
  // Bundle the shared libraries for browser use
  // They are used by both the main client-side script and module scripts
  {
    input: sharedLibs,
    output: {
      dir: "./src/main/resources/javascript/shared-libs/",
    },
    plugins: [
      ...plugins,
      // Minify client files in production
      buildEnv === "production" && terser(),
      {
        name: "extract-shared-lib-files",
        generateBundle(_, bundle) {
          // Collect all output JS files
          sharedLibFiles = Object.entries(bundle)
            .filter(([, { type }]) => type === "chunk")
            .map(([name]) => name);
        },
      },
    ],
  },
  // Bundle the shared libraries for server use
  {
    input: {
      // React ships as CJS, so we need our own shims
      // See src/client-javascript/shared-libs/README.md for details
      "react": "./src/client-javascript/shared-libs/react.ts",
      "react/jsx-runtime": "./src/client-javascript/shared-libs/react/jsx-runtime.ts",

      // Packages already in ESM can be copied as-is from node_modules
      "i18next": "i18next",
      "react-i18next": "react-i18next",
      "@jahia/javascript-modules-library": "@jahia/javascript-modules-library",
    },
    output: {
      dir: "./src/main/resources/META-INF/js/libs/",
    },
    plugins: [
      {
        /**
         * Custom plugin to resolve "@jahia/javascript-modules-library" correctly.
         *
         * We intentionally don't ship the actual code of the library to prevent misuse by end
         * developers, but on our end we need to resolve it to the real dist files, outputted in the
         * `internal-dist` directory.
         */
        name: "resolve-library",
        resolveId(id) {
          if (id === "@jahia/javascript-modules-library") {
            return fileURLToPath(
              new URL(
                // Resolve `../internal-dist/index.js` from `lib/dist/index.js`
                "../internal-dist/index.js",
                import.meta.resolve("@jahia/javascript-modules-library"),
              ),
            );
          }
        },
      },
      {
        name: "inject-shared-lib-files",
        resolveId(id) {
          if (id === "virtual:shared-lib-files") return `\0shared-lib-files`;
        },
        load(id) {
          if (id === "\0shared-lib-files")
            return `export default ${JSON.stringify(sharedLibFiles)};`;
        },
      },
      ...plugins,
    ],
  },
  // Build the server-side script
  // It takes care of rendering JSX components on the server
  {
    input: "./src/javascript/index.ts",
    output: {
      file: "./src/main/resources/META-INF/js/main.js",
    },
    external: [
      // All shared server libraries are imported using standard ESM imports
      "@jahia/javascript-modules-library",
      "react/jsx-runtime",
      "i18next",
      "react-i18next",
      "react",
    ],
    plugins,
  },
]);
