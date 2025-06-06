# @jahia/vite-plugin

A Vite plugin to develop JavaScript Modules for the Jahia platform.

## Installation

Using our [project creation CLI (@jahia/create-module)](https://www.npmjs.com/package/@jahia/create-module) should set you up correctly. It will ship with good defaults to get you started, but your workflow might need more advanced settings. For that, the `jahia` Vite plugin can take an object of options:

```js
import { defineConfig } from "vite";
import jahia from "@jahia/vite-plugin";
import { spawnSync } from "node:child_process";

export default defineConfig({
  plugins: [
    jahia({
      // Parent directory of all JS code
      inputDir: "src",

      // Output directory for the compiled module
      outputDir: "dist",

      // Directory where static assets will be copied
      assetsDir: "assets", // Computed as dist/assets

      // Client options
      client: {
        inputGlob: "**/*.client.{jsx,tsx}", // Computed as src/**/*.client.{jsx,tsx}
        outputDir: "client", // Computed as dist/client
      },

      // Server options
      server: {
        inputGlob: "**/*.server.{jsx,tsx}", // Computed as src/**/*.server.{jsx,tsx}
        outputFile: "server/index.js", // Computed as dist/server/index.js
      },

      // This function is called every time a build succeeds in watch mode
      watchCallback() {
        spawnSync("yarn", ["watch:callback"], { stdio: "inherit" });
      },
    }),
  ],
});
```
