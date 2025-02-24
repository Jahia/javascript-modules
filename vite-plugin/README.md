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
      // This function is called every time a build succeeds in watch mode
      watchCallback() {
        spawnSync("yarn", ["watch:callback"], { stdio: "inherit" });
      },
    }),
  ],
});
```
