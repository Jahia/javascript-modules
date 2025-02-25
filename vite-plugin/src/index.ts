import path from "node:path";
import type { PluginOption } from "vite";
import sharedLibs from "javascript-modules-engine/shared-libs.mjs";
import type { Plugin } from "rollup";

// These libraries are provided by Jahia and should not be bundled
const external = Object.keys(sharedLibs);

/** Plugin to execute a callback when a build succeeds. */
function buildSuccessPlugin(callback: () => void | Promise<void>): Plugin {
  let succeeded = true;
  return {
    name: "build-success-callback",
    buildEnd(error) {
      succeeded = !error;
    },
    async closeBundle() {
      if (succeeded) await callback();
    },
  };
}

export default function jahia(
  options: {
    /** Options for the client-side loader. */
    client?: {
      /**
       * Entrypoint for the client-side loader.
       *
       * @default "./src/client/index.js"
       */
      input?: string;
      /**
       * Where to put the built client-side loader.
       *
       * @default "./javascript/client/index.js"
       */
      output?: string;
    };

    /** Options for the server-side bundle. */
    server?: {
      /**
       * Entrypoint for the server-side bundle.
       *
       * @default "./src/index.js"
       */
      input?: string;
      /** Where to put the built server-side bundle. */
      output?: {
        /**
         * Directory where to put the built server-side bundle.
         *
         * @default "./javascript/server"
         */
        dir?: string;
        /**
         * Base name for the built server-side bundle.
         *
         * Will be appended with '.js' for the JavaScript output and '.css' for the CSS output.
         *
         * @default "index"
         */
        fileName?: string;
      };
    };

    /**
     * Function to execute when the build is complete in watch mode. Can be used to automatically
     * deploy your module to a local Jahia instance.
     *
     * @default undefined
     */
    watchCallback?: () => void | Promise<void>;
  } = {},
): PluginOption {
  return {
    name: "@jahia/vite-plugin",
    /**
     * Configuration hook.
     *
     * Updating the configuration can be done both by mutation or by merging. We use both methods to
     * offer the best experience for the user.
     *
     * @see https://vite.dev/guide/api-plugin.html#config
     */
    config(config) {
      // Mutate the configuration to set base settings if they are not already set
      // Build all environments https://vite.dev/guide/api-environment-frameworks.html#environments-during-build
      config.builder ??= {};

      // Enable the modern JSX runtime
      config.esbuild ??= { jsx: "automatic" };

      config.resolve ??= {};
      config.resolve.alias ??= { $client: path.resolve("./src/client") };

      return {
        environments: {
          client: {
            build: {
              lib: {
                // Single entry point for the client, all other files must be imported in this one
                entry: options.client?.input ?? "./src/client/index.js",
                formats: ["es"],
              },
              rollupOptions: {
                output: {
                  dir: path.dirname(options.client?.output ?? "./javascript/client/index.js"),
                  entryFileNames: path.basename(
                    options.client?.output ?? "./javascript/client/index.js",
                  ),
                },
                external,
              },
            },
          },
          ssr: {
            build: {
              lib: {
                /**
                 * Necessary for IIFE format but not used; it's the name given to the global
                 * variable that will be created by the IIFE.
                 */
                name: "serverBundle",
                entry: options.server?.input ?? "./src/index.js",
                fileName: options.server?.output?.fileName ?? "index",
                // Bundle the old way, as an IIFE, to replace libs with globals
                formats: ["iife"],
              },
              rollupOptions: {
                output: {
                  dir: options.server?.output?.dir ?? "./javascript/server",
                  entryFileNames: `${options.server?.output?.fileName ?? "index"}.js`,
                  // Replace the imports of external libraries with the globals
                  globals: Object.fromEntries(
                    [
                      ...external,
                      // This is only available on the server, attempting to import it
                      // on the client will throw an error
                      "@jahia/javascript-modules-library",
                    ].map((lib) => [
                      lib,
                      // This is how a shared library is imported in the server bundle
                      `javascriptModulesLibraryBuilder.getSharedLibrary(${JSON.stringify(lib)})`,
                    ]),
                  ),
                },
                external: [...external, "@jahia/javascript-modules-library"],
                plugins:
                  // Only add the callback plugin in watch mode
                  config.build?.watch &&
                  options.watchCallback &&
                  buildSuccessPlugin(options.watchCallback),
              },
            },
          },
        },
      };
    },
  };
}
