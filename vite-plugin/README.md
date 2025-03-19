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
      // Client options
      client: {
        input: {
          // Parent directory of client-side code
          dir: "./src/client",
          // Glob pattern to match all client-side code in dir
          glob: "**‍/*.jsx",
        }
        // Output directory for client-side code
        output: "./javascript/client/",
      },

      // Server options
      server: {
        // You can use a glob pattern to match multiple files
        input: "./src/server/index.{js,ts}",
        output: {
          dir: "./javascript/server",
          fileName: "index", // Will produce index.js and index.css
          // A known bug causes the css file to be named style.css regardless of this setting
        },
      },

      // This function is called every time a build succeeds in watch mode
      watchCallback() {
        spawnSync("yarn", ["watch:callback"], { stdio: "inherit" });
      },
    }),
  ],
});
```
