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
          glob: "**/*.tsx",
        },
        output: "./dist/client/",
      },
      server: {
        input: "./src/react/server/**/*.{ts,tsx}",
        output: {
          dir: "./dist/server",
        },
      },
      // This function is called every time a build succeeds in watch mode
      watchCallback() {
        spawnSync("yarn", ["watch:callback"], { stdio: "inherit" });
      },
    }),
  ],
  build: {
    sourcemap: true,
  },
});
