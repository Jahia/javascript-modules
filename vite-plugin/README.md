# @jahia/vite-plugin

A Vite plugin to develop JavaScript Modules for the Jahia platform.

This README will be updated soon.

## Installation

Using our project creation CLI should set you up correctly. It will ship with good defaults to get you started, but your workflow might need more advanced settings. For that, the `jahia` Vite plugin can take an object of options:

```js
import { defineConfig } from "vite";
import jahia from "@jahia/vite-plugin";

export default defineConfig({
  plugins: [
    jahia({
      // Client options
      client: {
        input: "./src/client/index.js",
        // /!\ This path is currently hard-coded in the engine loader,
        // it cannot be changed yet.
        output: "./javascript/client/index.js",
      },

      // Server options
      server: {
        // You can use a glob pattern to match multiple files
        input: "./src/server/index.{js,ts}",
        output: {
          dir: "./javascript/server",
          fileName: "index", // Will produce index.js and index.css
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
