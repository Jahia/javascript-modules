// @ts-check
import commonJs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import replace from "@rollup/plugin-replace";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import { defineConfig } from "rollup";
import sbom from "rollup-plugin-sbom";

/**
 * The build environment is either "development" or "production".
 *
 * It comes from the --environment BUILD:... flag in the build command.
 */
const buildEnv = process.env.BUILD || "development";

/** These are the libraries shared between all client-side scripts. */
const sharedLibs = {
  // React ships as CJS, so we need our own shims
  // See src/client-javascript/shared-libs/README.md for details
  "react": "src/client-javascript/shared-libs/react.ts",
  "react/jsx-runtime": "src/client-javascript/shared-libs/react/jsx-runtime.ts",
  "react-dom/client": "src/client-javascript/shared-libs/react-dom/client.ts",

  // Packages already in ESM can be copied as-is from node_modules
  "i18next": "i18next",
  "react-i18next": "react-i18next",
};

/** Common Rollup plugins to all builds. */
const plugins = [
  commonJs(),
  nodeResolve({
    // The library exposes JS code under an inaccessible import to prevent bundling by clients
    exportConditions: ["jahia-import"],
  }),
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
    input: "src/client-javascript/index.ts",
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
      dir: "src/main/resources/javascript/shared-libs/",
    },
    plugins,
  },
  // Build the server-side script
  // It takes care of rendering JSX components on the server
  {
    input: "src/javascript/index.ts",
    output: {
      file: "src/main/resources/META-INF/js/main.js",
      format: "iife",
      globals: {
        "virtual:jahia-server": "javascriptModulesLibraryBuilder.getServer()",
      },
    },
    external: ["virtual:jahia-server"],
    plugins,
  },
]);
