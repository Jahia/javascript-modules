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
  // Only minify in production
  buildEnv === "production" && terser(),
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
    plugins,
  },
  // Bundle the shared libraries
  // They are used by both the main client-side script and module scripts
  {
    input: sharedLibs,
    output: {
      dir: "./src/main/resources/javascript/shared-libs/",
    },
    plugins,
  },
  // Build the server-side script
  // It takes care of rendering JSX components on the server
  {
    input: "./src/javascript/index.ts",
    output: {
      file: "./src/main/resources/META-INF/js/main.js",
      format: "iife",
      globals: {
        "virtual:jahia-server": "javascriptModulesLibraryBuilder.getServer()",
      },
    },
    external: ["virtual:jahia-server"],
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
      ...plugins,
    ],
  },
]);
