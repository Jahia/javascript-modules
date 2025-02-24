import { resolve } from "node:path";
import type { Plugin } from "vite";

export default function jahia(): Plugin {
  return {
    name: "@jahia/vite-plugin",
    config() {
      return {
        /**
         * Build all environments during the build process.
         *
         * @see https://vite.dev/guide/api-environment-frameworks.html#environments-during-build
         */
        builder: {},
        resolve: {
          // Alias the client folder to the server folder
          alias: { $client: resolve("./src/client") },
        },
        esbuild: { jsx: "automatic" },
        environments: {
          client: {
            build: {
              lib: {
                name: "example",
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
                name: "example",
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
                  globals: {
                    ...buildStore(serverStore),
                    // This is only available on the server, attempting to import it
                    // on the client will throw an error
                    "@jahia/javascript-modules-library": serverStore(
                      "@jahia/javascript-modules-library",
                    ),
                  },
                },
                external: [...external, "@jahia/javascript-modules-library"],
              },
            },
          },
        },
      };
    },
  };
}

// Configuration utils, you probably don't need to touch these

// These libraries are provided by Jahia and should not be bundled
const external = ["i18next", "react-i18next", "react", "react/jsx-runtime"];

// This is the way to access shared libraries server-side
const serverStore = (/** @type {string} */ lib) =>
  `javascriptModulesLibraryBuilder.getSharedLibrary(${JSON.stringify(lib)})`;

/** Creates a bare import to external library mapping. */
const buildStore = (/** @type {(lib: string) => string} */ store) =>
  Object.fromEntries(external.map((lib) => [lib, store(lib)]));
