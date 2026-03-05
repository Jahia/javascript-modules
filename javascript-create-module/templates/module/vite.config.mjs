import jahia from "@jahia/vite-plugin";
import { spawnSync } from "node:child_process";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    jahia({
      // Default values:
      // inputDir: "src",
      // outputDir: "dist",
      // assetsDir: "assets",
      // client: {
      //   inputGlob: "**/*.client.{jsx,tsx}",
      //   outputDir: "client",
      // },
      // server: {
      //   inputGlob: "**/*.server.{jsx,tsx}",
      //   outputFile: "server/index.js",
      // },

      // This function is called every time a build succeeds in watch mode
      watchCallback() {
        spawnSync("yarn", ["watch:callback"], { stdio: "inherit", shell: true });
      },
    }),
  ],
});
