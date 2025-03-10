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
    }),
  ],
  build: {
    sourcemap: true,
  },
});
