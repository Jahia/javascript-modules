import { defineConfig } from "vite";
import jahia from "@jahia/vite-plugin";

export default defineConfig({
  plugins: [jahia()],
});
