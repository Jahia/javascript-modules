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
        input: {
          // dir: "./src/client",
          glob: "**/*.tsx",
        },
        output: "./dist/client/",
      },
      server: {
        input: "./src/react/server/**/*.{ts,tsx}",
        output: {
          dir: "./dist/server",
          fileName: "index",
        },
      },
    }),
  ],
  build: {
    rollupOptions: {
      external: ["org.jahia.services.content"],
    },
  },
});
