import { resolve } from "node:path";
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
    /**
     * Function to execute when the build is complete in watch mode. Can be used to automatically
     * deploy your module to a local Jahia instance.
     */
    watchCallback?: () => void | Promise<void>;
  } = {},
): PluginOption {
  return {
    name: "@jahia/vite-plugin",
    config(config) {
      return {
        /**
         * Build all environments during the build process.
         *
         * @see https://vite.dev/guide/api-environment-frameworks.html#environments-during-build
         */
        builder: {
          sharedConfigBuild: true,
          sharedPlugins: true,
        },
        resolve: {
          // Alias the client folder to the server folder
          alias: { $client: resolve("./src/client") },
        },
        esbuild: { jsx: "automatic" },
        environments: {
          client: {
            build: {
              lib: {
                // Single entry point for the client, all other files must be imported in this one
                entry: "src/client/index.js",
                formats: ["es"],
              },
              rollupOptions: {
                output: {
                  dir: "javascript/client",
                  entryFileNames: "index.js",
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
                entry: "src/index.js",
                // Output the styles in a single, separate file: styles.css
                cssFileName: "styles",
                // Bundle the old way, as an IIFE, to replace libs with globals
                formats: ["iife"],
              },
              rollupOptions: {
                output: {
                  dir: "javascript/server",
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
