import { createFilter } from "@rollup/pluginutils";
import MagicString from "magic-string";
import type { AstNode, Plugin } from "rollup";

/**
 * This plugin adds a `__filename` property to all default exports.
 *
 * It allows mapping files between client and server, to perform partial hydration.
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
 *     Object.defineProperty(v, "__filename", {
 *       value: "path/to/file.js",
 *       enumerable: false,
 *     });
 *   }
 *   return v;
 * })(function myFunction() {
 *   console.log(myFunction.__filename);
 * });
 * ```
 *
 * The typeof check is necessary because `Object.defineProperty` can only be called on objects.
 *
 * @param root The root of the transformation. Files outside this directory will not be transformed,
 *   files inside (and matching the glob) will have their inserted path relative to this directory.
 * @param glob The glob pattern(s) to match files to transform.
 * @param prefix The prefix to add to the path.
 */
export const insertFilename = (
  root: string,
  glob: string | string[],
  transform: (id: string) => string,
): Plugin => {
  const filter = createFilter(glob, null, {
    resolve: root,
  });
  return {
    name: "insert-path",

    transform(code, id) {
      if (!filter(id)) return;
      const s = new MagicString(code);
      const ast = this.parse(code);
      for (const node of ast.body) {
        if (node.type === "ExportDefaultDeclaration") {
          const declaration = node.declaration as AstNode;
          s.prependLeft(
            declaration.start,
            `
(function (v) {
  if (typeof v === "function" || typeof v === "object" && v)
    Object.defineProperty(v, "__filename", {
      value: ${JSON.stringify(transform(id))},
      enumerable: false,
    });
  return v;
})(`,
          );
          s.appendRight(declaration.end, ")");
        }
      }
      return {
        code: s.toString(),
        map: s.generateMap({ source: id, includeContent: true, hires: "boundary" }),
      };
    },
  };
};
