import { defineConfig } from "vite";
import jahia from "@jahia/vite-plugin";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { $client: path.resolve("./src/client") },
  },
  plugins: [
    jahia({
      server: {
        input: "./src/react/server/**/*.jsx",
      },
    }),
  ],
});
