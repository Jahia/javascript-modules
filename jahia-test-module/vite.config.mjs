// @ts-check
import jahia from "@jahia/vite-plugin";
import path from "node:path";
import { defineConfig } from "vite";

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
