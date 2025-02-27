import { defineConfig } from "vite";
import jahia from "@jahia/vite-plugin";
import path from "node:path";
import { spawnSync } from "node:child_process";

export default defineConfig({
  resolve: {
    alias: { $client: path.resolve("./src/client") },
  },
  plugins: [
    jahia({
      client: {
        input: {
          dir: "./src/client/",
          glob: "**/*.{jsx,tsx}",
        },
        output: "./dist/client/",
      },
      server: {
        // You can use a glob pattern to match multiple files
        input: "./src/server/**/*.{jsx,tsx}",
        output: {
          dir: "./dist/server",
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
