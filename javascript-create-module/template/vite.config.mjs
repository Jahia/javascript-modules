import { defineConfig } from "vite";
import jahia from "@jahia/vite-plugin";
import { spawnSync } from "node:child_process";

export default defineConfig({
  plugins: [
    jahia({
      // This function is called every time a build succeeds in watch mode
      watchCallback() {
        spawnSync("yarn", ["watch:callback"], { stdio: "inherit", shell: true });
      },
    }),
  ],
});
