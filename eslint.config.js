// @ts-check
import eslintReact from "@eslint-react/eslint-plugin";
import { includeIgnoreFile } from "@eslint/compat";
import eslint from "@eslint/js";
import pluginCypress from "eslint-plugin-cypress";
import { defineConfig } from "eslint/config";
import globals from "globals";
import path from "node:path";
import tseslint from "typescript-eslint";

export default defineConfig(
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.jest, ...globals.node },
    },
  },
  // JS/TS recommended
  eslint.configs.recommended,
  { files: ["**/*.ts", "**/*.tsx"], extends: tseslint.configs.recommended },
  // React
  eslintReact.configs["recommended-typescript"],
  {
    rules: {
      // We know what we're doing
      "@eslint-react/dom/no-dangerously-set-innerhtml": "off",
    },
  },
  // Cypress
  pluginCypress.configs.recommended,
  {
    files: ["**/*.cy.ts"],
    rules: {
      // Stop reporting `expect().to.exist`
      "@typescript-eslint/no-unused-expressions": "off",
    },
  },
  // Ignore the same files as .gitignore
  includeIgnoreFile(path.resolve(import.meta.dirname, ".gitignore")),
  { ignores: ["**/fixtures/expected/**"] },
);
