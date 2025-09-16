import { clientLibs, serverLibs } from "javascript-modules-engine/shared-libs.mjs";
import path from "node:path";
import { styleText } from "node:util";
import { globSync } from "tinyglobby";
import type { PluginOption } from "vite";
import { buildSuccessful } from "./build-successful.js";
import { insertFilename } from "./insert-filename.js";
import { multiEntry } from "./multi-entry.js";

export default function jahia(
  options: {
    /**
     * Source directory where to find all source files.
     *
     * @default "src"
     */
    inputDir?: string;

    /**
     * Directory where to put all built files.
     *
     * @default "dist"
     */
    outputDir?: string;

    /**
     * Directory where to put all built assets (e.g. images, fonts, etc.).
     *
     * This directory will be nested in the `outputDir` directory.
     *
     * @default "assets"
     */
    assetsDir?: string;

    /** Options for the client-side loader. */
    client?: {
      /**
       * Glob pattern(s) used to find all client-side code in `inputDir`.
       *
       * See [tinyglobby](https://www.npmjs.com/package/tinyglobby) for supported patterns.
       *
       * @default "**‍/*.client.{jsx,tsx}"
       */
      inputGlob?: string | string[];
      /**
       * Where to put the client-side bundle. It is a directory that will have the same structure as
       * the source directory. It will be nested in the `outputDir` directory.
       *
       * @default "client"
       */
      outputDir?: string;
      /**
       * Enable source maps for client-side files.
       *
       * @default `true` in dev mode, `false` otherwise
       * @see https://vite.dev/config/build-options.html#build-sourcemap
       */
      sourcemap?: boolean | "hidden" | "inline" | undefined;
    };

    /** Options for the server-side bundle. */
    server?: {
      /**
       * Entrypoint for the server-side bundle.
       *
       * [Glob patterns are
       * supported.](https://www.npmjs.com/package/@rollup/plugin-multi-entry#supported-input-types)
       *
       * @default "**‍/*.server.{jsx.tsx}"
       */
      inputGlob?: string;
      /**
       * Where to put the server-side bundle. As the bundle is a single file, this is the path to
       * the output file, relative to the `outputDir` directory, without the extension.
       *
       * @default "server/index.js"
       */
      outputFile?: string;
      /**
       * Enable source maps for the server-side bundle.
       *
       * @default `true`
       * @see https://vite.dev/config/build-options.html#build-sourcemap
       */
      sourcemap?: boolean | "hidden" | "inline" | undefined;
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
  const assetsDir = options.assetsDir ?? "assets";
  const clientBaseDir = options.inputDir ?? "src";
  const clientEntries = globSync(options.client?.inputGlob ?? "**/*.client.{jsx,tsx}", {
    cwd: clientBaseDir,
  });

  if (clientEntries.length === 0) {
    console.warn(
      `${styleText("yellowBright", "[@jahia/vite-plugin] Skipping client build because there are no entry files...")}
 • If this is the intended behavior, you can safely ignore this message
 • Otherwise, ensure that your client files are properly configured in the plugin options
   Client base directory: ${styleText("cyanBright", options.inputDir ?? "src (default value)")}
   Client glob pattern:   ${styleText("cyanBright", String(options.client?.inputGlob ?? "**/*.client.{jsx,tsx} (default value)"))}`,
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
        builder: {},
        // Enforce bundling of all dependencies
        ssr: { noExternal: true },
        // Replace process.env.NODE_ENV with the actual value
        define: {
          "process.env.NODE_ENV": JSON.stringify(
            config.build?.watch ? "development" : "production",
          ),
        },
        // Define the environments (client and ssr)
        environments: {
          client: {
            build: {
              sourcemap: options.client?.sourcemap ?? Boolean(config.build?.watch),
              // Assets will be emitted in the SSR build
              emitAssets: false,
              assetsDir,
              rollupOptions: {
                input: Object.fromEntries(
                  clientEntries.map((file) => [file, path.posix.join(clientBaseDir, file)]),
                ),
                output: {
                  dir: options.outputDir ?? "dist",
                  // Preserve the filenames of the entry points, to allow the hydration code
                  // to import the correct files
                  entryFileNames: path.posix.join(
                    options.client?.outputDir ?? "client",
                    "[name].js",
                  ),
                },
                // By default, Vite only keep side effects, but entry points work by exporting a
                // default function component. Ensure entry points keep their "signature" (i.e.
                // their exports).
                preserveEntrySignatures: "allow-extension",
                external: Object.keys(clientLibs),
                plugins: [
                  {
                    name: "forbid-library",
                    resolveId(id) {
                      if (id === "@jahia/javascript-modules-library") {
                        throw new Error(
                          `You cannot import '@jahia/javascript-modules-library' in the client bundle`,
                        );
                      }
                    },
                  },
                  // Only add the callback plugin in watch mode
                  config.build?.watch &&
                    options.watchCallback &&
                    buildSuccessful(options.watchCallback),
                ],
              },
            },
          },
          ssr: {
            build: {
              sourcemap: options.server?.sourcemap ?? true,
              // Emit assets, produce a single CSS file
              emitAssets: true,
              assetsDir,
              cssCodeSplit: false,
              emptyOutDir: false,
              rollupOptions: {
                input: path.posix.join(
                  options.inputDir ?? "src",
                  options.server?.inputGlob ?? "**/*.server.{jsx,tsx}",
                ),
                output: {
                  dir: options.outputDir ?? "dist",
                  chunkFileNames: "server/[name]-[hash].js",
                  // Produce a consistent name for the style file, hash other assets
                  assetFileNames: ({ originalFileNames }) =>
                    path.posix.join(
                      assetsDir,
                      // `style.css` is hardcoded in Vite when CSS Code Splitting is disabled
                      originalFileNames.includes("style.css")
                        ? "style.css"
                        : "[name]-[hash][extname]",
                    ),
                },
                external: Object.keys(serverLibs),
                treeshake: {
                  // Manually mark useEffect as pure to have it removed from the SSR bundle
                  manualPureFunctions: ["useEffect"],
                },
                plugins: [
                  multiEntry(options.server?.outputFile ?? "server/index.js"),
                  // Only add the callback plugin in watch mode
                  config.build?.watch &&
                    options.watchCallback &&
                    buildSuccessful(options.watchCallback),
                  // Insert filenames in client-side components
                  insertFilename(
                    clientBaseDir,
                    options.client?.inputGlob ?? "**/*.client.{jsx,tsx}",
                    // Convert a client source filename into a client production filename
                    (id: string) =>
                      path.posix.join(
                        options.outputDir ?? "dist",
                        options.client?.outputDir ?? "client",
                        // Compute the relative path platform-specifically to support Windows
                        path.relative(clientBaseDir, id),
                      ),
                  ),
                ],
              },
            },
          },
        },

        experimental: {
          renderBuiltUrl(filename, { ssr, hostType }) {
            // In SSR, resolve the full path to the file in the server output directory
            if (ssr) {
              // In JS mode, resolve to the full output path
              if (hostType === "js") return path.posix.join(options.outputDir ?? "dist", filename);

              // In CSS mode, resolve to the relative path from the assets directory
              return path.posix.relative(assetsDir, filename);
            }
            return { relative: true };
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
