import { createFilter } from "@rollup/pluginutils";
import MagicString from "magic-string";
import type { Plugin } from "rolldown";

/**
 * Builds the property descriptors attaching the hydration metadata to a component.
 *
 * Properties are `configurable` so that a component exported twice (e.g. `export const Foo = …;
 * export default Foo;`) is tagged twice rather than throwing.
 */
const descriptors = (filename: string, exportName: string) =>
  `{
      __filename: { value: ${JSON.stringify(filename)}, enumerable: false, configurable: true },
      __exportName: { value: ${JSON.stringify(exportName)}, enumerable: false, configurable: true },
    }`;

/** Statement tagging an already-declared binding, appended after its declaration. */
const tagBinding = (identifier: string, filename: string, exportName: string) =>
  `
;(function (v) {
  if ((typeof v === "function" || typeof v === "object" && v) && Object.isExtensible(v))
    Object.defineProperties(v, ${descriptors(filename, exportName)});
})(${identifier});
`;

/**
 * This plugin adds `__filename` and `__exportName` properties to all exported components.
 *
 * They allow mapping files between client and server, to perform partial hydration: the server uses
 * `__filename` to point the browser at the client bundle, and `__exportName` to tell it which
 * export to pick up.
 *
 * ```js
 * export default function myFunction() {
 *   console.log(myFunction.__filename);
 * }
 * ```
 *
 * Becomes
 *
 * ```js
 * export default (function (v) {
 *   if (typeof v === "function" || (typeof v === "object" && v)) {
 *     Object.defineProperties(v, {
 *       __filename: { value: "path/to/file.js", enumerable: false, configurable: true },
 *       __exportName: { value: "default", enumerable: false, configurable: true },
 *     });
 *   }
 *   return v;
 * })(function myFunction() {
 *   console.log(myFunction.__filename);
 * });
 * ```
 *
 * Named exports (`export function Foo() {}`, `export const Foo = …`, `export class Foo {}`) are
 * tagged by a statement appended after their declaration, as a declaration cannot be wrapped in an
 * expression. `export { … }` lists and re-exports are not supported: components exported that way
 * carry no metadata, which `<Island>` reports as an error rather than letting the browser request
 * an `undefined.js` bundle.
 *
 * The typeof check is necessary because `Object.defineProperties` can only be called on objects,
 * and the `Object.isExtensible` check skips frozen/sealed exports (e.g. a frozen config object in a
 * client file), which would otherwise throw and break the whole bundle evaluation.
 *
 * @param root The root of the transformation. Files outside this directory will not be transformed,
 *   files inside (and matching the glob) will have their inserted path relative to this directory.
 * @param glob The glob pattern(s) to match files to transform.
 * @param transform The function to transform the path.
 */
export function insertFilename(
  root: string,
  glob: string | string[],
  transform: (id: string) => string,
): Plugin {
  const filter = createFilter(glob, null, {
    resolve: root,
  });
  return {
    name: "insert-path",

    transform(code, id) {
      if (!filter(id)) return;
      const s = new MagicString(code);
      const ast = this.parse(code);
      const filename = transform(id);
      for (const node of ast.body) {
        if (node.type === "ExportDefaultDeclaration") {
          const declaration = node.declaration;
          s.prependLeft(
            declaration.start,
            `
(function (v) {
  if ((typeof v === "function" || typeof v === "object" && v) && Object.isExtensible(v))
    Object.defineProperties(v, ${descriptors(filename, "default")});
  return v;
})(`,
          );
          s.appendRight(declaration.end, ")");
        } else if (node.type === "ExportNamedDeclaration" && node.declaration) {
          const declaration = node.declaration;
          // `export function Foo() {}` / `export class Foo {}`
          if (
            (declaration.type === "FunctionDeclaration" ||
              declaration.type === "ClassDeclaration") &&
            declaration.id
          ) {
            const name = declaration.id.name;
            s.appendRight(declaration.end, tagBinding(name, filename, name));
          }
          // `export const Foo = …`, possibly declaring several bindings at once
          else if (declaration.type === "VariableDeclaration") {
            for (const declarator of declaration.declarations) {
              // Destructuring patterns have no single name to tag, skip them
              if (declarator.id.type !== "Identifier") continue;
              const name = declarator.id.name;
              s.appendRight(declaration.end, tagBinding(name, filename, name));
            }
          }
        }
      }
      return {
        code: s.toString(),
        map: s.generateMap({ source: id, includeContent: true, hires: "boundary" }),
      };
    },
  };
}
