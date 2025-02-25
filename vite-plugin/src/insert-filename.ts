import { print } from "esrap";
import type { Node } from "estree";
import { Plugin } from "rollup";
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
 */
export const insertFilename = (): Plugin => ({
  name: "insert-path",
  transform(code, id) {
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
                type: "FunctionExpression",
                id: node.declaration.id,
                body: node.declaration.body,
                params: node.declaration.params,
                async: node.declaration.async,
                generator: node.declaration.generator,
                leadingComments: node.declaration.leadingComments,
                trailingComments: node.declaration.trailingComments,
                range: node.declaration.range,
                loc: node.declaration.loc,
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
                    value: { type: "Literal", value: id },
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
});
