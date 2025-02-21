// @ts-check
import fs from "node:fs";

/** @type {(path: string) => URL} */
const relative = (path) => new URL(path, import.meta.url);

// Add the global declarations to the `dist` directory
fs.copyFileSync(relative("./src/globals.d.ts"), relative("./dist/globals.d.ts"));

let additionalExports = `
// Include declarations for all Java types
export * from "./globals";
`;

// All useful Java objects are converted to TypeScript types in `target/types`
const javaTypes = fs.readdirSync(relative("./target/types/"));

// Copy all Java types to the `dist/types` directory, append them to the `dist/index.d.ts`
for (const javaType of javaTypes) {
  fs.copyFileSync(relative(`./target/types/${javaType}`), relative(`./dist/${javaType}`));
  additionalExports += `export * from "./${javaType.replace(/\.d\.ts$/, "")}";\n`;
}
fs.appendFileSync(new URL("./dist/index.d.ts", import.meta.url), additionalExports);

// Add an helpful message to the user in case they try to import the `dist` directory
fs.writeFileSync(
  relative("./dist/index.js"),
  `console.error(
  "You cannot import and run '@jahia/javascript-modules-library' because it's a virtual module.\\n" +
  "Something is wrong with your build configuration: instead of bundling '@jahia/javascript-modules-library', it should be replaced with 'javascriptModulesLibraryBuilder.getSharedLibrary(\\"@jahia/javascript-modules-library\\")'."
);
export {};
`,
);
