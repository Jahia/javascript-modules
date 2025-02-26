// @ts-check
import { includeIgnoreFile } from "@eslint/compat";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import path from "node:path";
import globals from "globals";
import eslintReact from "@eslint-react/eslint-plugin";
import pluginCypress from "eslint-plugin-cypress/flat";

export default tseslint.config(
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
);
