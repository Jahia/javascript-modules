import multiEntry from "@rollup/plugin-multi-entry";
import sharedLibs from "javascript-modules-engine/shared-libs.mjs";
import path from "node:path";
import { styleText } from "node:util";
import type { Plugin } from "rollup";
import { globSync } from "tinyglobby";
import type { PluginOption } from "vite";
import { insertFilename } from "./insert-filename.js";

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
      /** Entrypoint for the client-side bundle. */
      input?: {
        /**
         * Parent directory of the client-side code.
         *
         * @default "./src/client/"
         */
        dir?: string;
        /**
         * Glob pattern(s) used to find all client-side code in `dir`.
         *
         * See [tinyglobby](https://www.npmjs.com/package/tinyglobby) for supported patterns.
         *
         * @default "**‍/*.jsx"
         */
        glob?: string | string[];
      };
      /**
       * Where to put the client-side bundle. It is a directory that will have the same structure as
       * the source directory.
       *
       * @default "./javascript/client/"
       */
      output?: string;
    };

    /** Options for the server-side bundle. */
    server?: {
      /**
       * Entrypoint for the server-side bundle.
       *
       * [Glob patterns are
       * supported.](https://www.npmjs.com/package/@rollup/plugin-multi-entry#supported-input-types)
       *
       * @default "./src/index.{js,ts}"
       */
      input?: string;
      /** Where to put the built server-side bundle. */
      output?: {
        /**
         * Directory where to put the built server-side bundle.
         *
         * @default "./javascript/server/"
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
  const clientBaseDir = options.client?.input?.dir ?? "./src/client/";
  const clientEntries = globSync(options.client?.input?.glob ?? "**/*.jsx", { cwd: clientBaseDir });

  if (clientEntries.length === 0) {
    console.warn(
      `${styleText("yellowBright", "[@jahia/vite-plugin] Skipping client build because there are no entry files...")}
 • If this is the intended behavior, you can safely ignore this message
 • Otherwise, ensure that your client files are properly configured in the plugin options
   Client base directory: ${styleText("cyanBright", options.client?.input?.dir ?? "./src/client/ (default value)")}
   Client glob pattern:   ${styleText("cyanBright", String(options.client?.input?.glob ?? "**/*.jsx (default value)"))}`,
    );
  }

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
      // Enable the modern JSX runtime
      config.esbuild ??= { jsx: "automatic" };

      return {
        // Build all environments https://vite.dev/guide/api-environment-frameworks.html#environments-during-build
        builder: { sharedConfigBuild: true },
        // Enforce bundling of all dependencies
        ssr: { noExternal: true },
        // Define the environments (client and ssr)
        environments: {
          client: {
            build: {
              lib: {
                entry: Object.fromEntries(
                  clientEntries.map((file) => [file, path.join(clientBaseDir, file)]),
                ),
                formats: ["es"],
              },
              rollupOptions: {
                output: {
                  dir: options.client?.output ?? "./javascript/client/",
                },
                external,
                plugins: [
                  {
                    name: "forbid-library",
                    resolveId(id) {
                      this.debug(id);
                      console.log(id);
                      if (id === "@jahia/javascript-modules-library") {
                        throw new Error(
                          `You cannot import '@jahia/javascript-modules-library' in the client bundle`,
                        );
                      }
                    },
                  },
                ],
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
                entry: options.server?.input ?? "./src/index.{js,ts}",
                fileName: options.server?.output?.fileName ?? "index",
                // Bundle the old way, as an IIFE, to replace libs with globals
                formats: ["iife"],
              },
              rollupOptions: {
                output: {
                  dir: options.server?.output?.dir ?? "./javascript/server/",
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
                treeshake: {
                  // Manually mark useEffect as pure to have it removed from the SSR bundle
                  manualPureFunctions: ["useEffect"],
                },
                plugins: [
                  multiEntry({
                    exports: false,
                    entryFileName: `${options.server?.output?.fileName ?? "index"}.js`,
                  }),
                  // Only add the callback plugin in watch mode
                  config.build?.watch &&
                    options.watchCallback &&
                    buildSuccessPlugin(options.watchCallback),
                  // Insert filenames in client-side components
                  insertFilename(
                    options.client?.input?.dir ?? "./src/client/",
                    options.client?.output ?? "./javascript/client/",
                  ),
                ],
              },
            },
          },
        },
      };
    },

    configResolved(config) {
      // If there are no client entries, remove the client environment to prevent a build error
      if (clientEntries.length === 0) delete config.environments.client;
    },

    // Needed to run before Vite's default resolver
    enforce: "pre",
    resolveId(id, importer) {
      if (this.environment.name === "client" && id === "@jahia/javascript-modules-library") {
        this.error(
          `\n\tCannot import @jahia/javascript-modules-library in the client bundle\n\tin ${importer}\n\t${styleText("bgRedBright", "This module is only available on the server.")}`,
        );
      }
    },
  };
}
