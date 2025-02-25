// @ts-check
/**
 * These are the libraries embedded in the JavaScript Modules engine and shared with JavaScript
 * modules, both on the server and the client.
 *
 * Declared as `name: path` pairs, where the name is the import specifier and the path is the path
 * to the file. Bare import specifiers are resolved as `node_modules` paths.
 *
 * @type {Record<string, string>}
 */
export default {
  // React ships as CJS, so we need our own shims
  // See src/client-javascript/shared-libs/README.md for details
  "react": "./src/client-javascript/shared-libs/react.ts",
  "react/jsx-runtime": "./src/client-javascript/shared-libs/react/jsx-runtime.ts",
  "react-dom/client": "./src/client-javascript/shared-libs/react-dom/client.ts",

  // Packages already in ESM can be copied as-is from node_modules
  "i18next": "i18next",
  "react-i18next": "react-i18next",
};
