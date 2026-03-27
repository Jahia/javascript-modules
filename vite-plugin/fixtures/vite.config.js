// @ts-check
import jahia from "@jahia/vite-plugin";
import { defineConfig } from "vite";
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
