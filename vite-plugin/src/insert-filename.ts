import { print } from "esrap";
import type { Node } from "estree";
import { Plugin } from "rollup";
import { walk } from "zimmerframe";
import { createFilter } from "@rollup/pluginutils";
import path from "path";

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
export const insertFilename = (root: string, prefix: string): Plugin => {
  const filter = createFilter(null, null, {
    resolve: root,
  });
  return {
    name: "insert-path",

    transform(code, id) {
      if (!filter(id)) return;
      const ast = walk(this.parse(code) as Node, null, {
        // Only target `export default function`
        ExportDefaultDeclaration(node) {
          if (node.declaration.type !== "FunctionDeclaration") return;
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
                {
                  // Original function
                  ...node.declaration,
                  type: "FunctionExpression",
                },
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
