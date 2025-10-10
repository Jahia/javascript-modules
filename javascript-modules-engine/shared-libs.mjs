// @ts-check
/**
 * These are the libraries embedded in the JavaScript Modules engine and shared with JavaScript
 * modules on the client.
 *
 * Declared as `name: path` pairs, where the name is the import specifier and the path is the path
 * to the file. Bare import specifiers are resolved as `node_modules` paths.
 *
 * @type {Record<string, string>}
 */
export const clientLibs = {
  // React ships as CJS, so we need our own shims
  // See src/esm-shims/README.md for details
  "react": "./src/shared/react.ts",
  "react/jsx-runtime": "./src/shared/react/jsx-runtime.ts",
  "react-dom": "./src/shared/react-dom.ts",
  "react-dom/client": "./src/shared/react-dom/client.ts",

  // Packages already in ESM can be copied as-is from node_modules
  "i18next": "i18next",
  "react-i18next": "react-i18next",
};

/**
 * Same as {@link clientLibs}, but for server libraries.
 *
 * @type {Record<string, string>}
 */
export const serverLibs = {
  "react": "./src/shared/react.ts",
  "react/jsx-runtime": "./src/shared/react/jsx-runtime.ts",
  "react-dom": "./src/shared/react-dom.ts",

  // Packages already in ESM can be copied as-is from node_modules
  "i18next": "i18next",
  "react-i18next": "react-i18next",

  // The JSM library is exclusive to the server
  "@jahia/javascript-modules-library": "@jahia/javascript-modules-library",
};
