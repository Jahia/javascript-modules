// @ts-check
import { defineConfig } from "vite";
import jahia from "@jahia/vite-plugin";
import inspect from "vite-plugin-inspect";

export default defineConfig({
  plugins: [
    inspect({
      build: true,
      outputDir: "./dist/.vite-inspect",
    }),
    jahia(),
  ],
});
