import { createFilter } from "@rollup/pluginutils";
import { print } from "esrap";
import type { Node } from "estree";
import path from "node:path";
import type { Plugin } from "rollup";
import { walk } from "zimmerframe";

/**
 * This plugin adds a `__filename` property to all default exports.
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
 * export default Object.defineProperty(
 *   function myFunction() {
 *     console.log(myFunction.__filename);
 *   },
 *   "__filename",
 *   {
 *     value: "path/to/file.js",
 *     enumerable: false,
 *   },
 * );
 * ```
 *
 * @param root The root of the transformation. Files outside this directory will not be transformed,
 *   files inside will have their inserted path relative to this directory.
 */
export const insertFilename = (root: string, glob: string | string[], prefix: string): Plugin => {
  const filter = createFilter(glob, null, {
    resolve: root,
  });
  return {
    name: "insert-path",

    transform(code, id) {
      if (!filter(id)) return;
      const ast = walk(this.parse(code) as Node, null, {
        // Only target `export default function`
        ExportDefaultDeclaration(node) {
          return {
            // export default
            type: "ExportDefaultDeclaration",
            leadingComments: node.leadingComments,
            trailingComments: node.trailingComments,
            range: node.range,
            loc: node.loc,
            declaration: {
              // Object.defineProperty(...)
              type: "CallExpression",
              optional: false,
              callee: {
                type: "MemberExpression",
                computed: false,
                optional: false,
                object: { type: "Identifier", name: "Object" },
                property: { type: "Identifier", name: "defineProperty" },
              },
              arguments: [
                // Convert function and class declarations to expressions, keep others as is
                node.declaration.type === "FunctionDeclaration"
                  ? { ...node.declaration, type: "FunctionExpression" }
                  : node.declaration.type === "ClassDeclaration"
                    ? { ...node.declaration, type: "ClassExpression" }
                    : node.declaration,
                { type: "Literal", value: "__filename" },
                {
                  // { value: id, enumerable: false }
                  type: "ObjectExpression",
                  properties: [
                    {
                      type: "Property",
                      computed: false,
                      kind: "init",
                      method: false,
                      shorthand: false,
                      key: { type: "Identifier", name: "value" },
                      value: { type: "Literal", value: prefix + path.relative(root, id) },
                    },
                    {
                      type: "Property",
                      computed: false,
                      kind: "init",
                      method: false,
                      shorthand: false,
                      key: { type: "Identifier", name: "enumerable" },
                      value: { type: "Literal", value: false },
                    },
                  ],
                },
              ],
            },
          };
        },
      });
      return print(ast);
    },
  };
};
