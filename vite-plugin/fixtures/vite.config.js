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
  css: {
    modules: {
      // Use a dummy hashing function for scoped CSS class names so that
      // it behaves the same on all platforms
      generateScopedName: (name) => name,
    },
  },
});
