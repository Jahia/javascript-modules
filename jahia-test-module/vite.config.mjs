// @ts-check
import { defineConfig } from "vite";
import jahia from "@jahia/vite-plugin";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { $client: path.resolve("./src/client") },
  },
  plugins: [
    jahia({
      client: {
        inputGlob: "client/**/*.tsx",
      },
      server: {
        inputGlob: "react/server/**/*.{ts,tsx}",
      },
    }),
  ],
});
