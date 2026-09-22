// @ts-check
import { defineConfig, includeIgnoreFile } from "eslint/config";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import path from "node:path";
import globals from "globals";
import eslintReact from "@eslint-react/eslint-plugin";
import pluginCypress from "eslint-plugin-cypress";

const QUERY_BUILDER_PURITY_MESSAGE =
  "The query builder's model layer is pure TypeScript. Reach the JCR session from src/query/qom.ts or src/query/execute.ts instead.";

/**
 * The query builder builds and inspects plain objects, and it runs in Node under `node --test`
 * without a JVM. Only the two sink files talk to the host, so the rest of `src/query/` may not read
 * the `server` global and may not import a Java package at run time.
 *
 * A type-only import of a Java type stays allowed, because it disappears at build time.
 *
 * @type {import("eslint").Linter.Config}
 */
const queryBuilderPurity = {
  files: ["./javascript-modules-library/src/query/**/*.ts"],
  ignores: [
    "./javascript-modules-library/src/query/qom.ts",
    "./javascript-modules-library/src/query/execute.ts",
  ],
  rules: {
    "no-restricted-globals": ["error", { name: "server", message: QUERY_BUILDER_PURITY_MESSAGE }],
    // Superseded by the typescript-eslint rule below, which knows about type-only imports
    "no-restricted-imports": "off",
    "@typescript-eslint/no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["java.*", "javax.*", "org.jahia.*", "org.osgi.*"],
            allowTypeImports: true,
            message: QUERY_BUILDER_PURITY_MESSAGE,
          },
        ],
      },
    ],
  },
};

export default defineConfig(
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.jest, ...globals.node },
    },
  },

  // JS/TS recommended
  eslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    extends: tseslint.configs.recommended,
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // React
  eslintReact.configs["recommended-typescript"],
  {
    rules: {
      // We know what we're doing
      "@eslint-react/dom-no-dangerously-set-innerhtml": "off",
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
  { ignores: ["**/fixtures/**", "./javascript-create-module/templates/**"] },

  // No rules of hook during server-side rendering
  {
    files: ["./javascript-modules-library/src/**"],
    rules: { "@eslint-react/rules-of-hooks": "off" },
  },

  // The library's unit tests are excluded from its publish build, so the project service finds no
  // tsconfig.json that claims them. The test build does, and the type aware rules read it here.
  // The pattern matches the `include` of that test build, so every file it claims has a project.
  {
    files: [
      "./javascript-modules-library/src/query/**/*.spec.ts",
      "./javascript-modules-library/src/utils/jcr/getNodesByJCRQuery.spec.ts",
      "./javascript-modules-library/src/hooks/useJCRQuery.spec.ts",
    ],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: ["./javascript-modules-library/tsconfig.test.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // The query builder's model layer stays free of the host
  queryBuilderPurity,
);
