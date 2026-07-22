import fs from "node:fs";
import type { Plugin } from "rolldown";

/**
 * Support for `.action.ts` files: functions written once, executed on the server, callable from
 * client code as if they were local async functions.
 *
 * Action files are compiled twice:
 *
 * - In the server bundle, the file is kept as-is and a registration call is appended, so every
 *   exported function becomes a callable action (`registerActionsModule` in the library).
 * - In the client bundle, the file is replaced by generated fetch stubs (one per export) that
 *   POST devalue-serialized arguments to the engine's generic action endpoint.
 *
 * Export discovery is intentionally simple (v1): only top-level `export const <name> = …` /
 * `export function <name>` / `export async function <name>` declarations are supported.
 */

const ACTION_FILE = /\.action\.(ts|js|mts|mjs)$/;
const EXPORT_DECLARATION = /^export\s+(?:const|let|async\s+function\s*\*?|function\s*\*?)\s+([A-Za-z_$][\w$]*)/gm;
const UNSUPPORTED_EXPORT = /^export\s*(?:\{|\*|default)/m;

export const isActionFile = (id: string): boolean => ACTION_FILE.test(id.split("?")[0]);

export const extractActionExports = (code: string): string[] => {
  const names = new Set<string>();
  for (const match of code.matchAll(EXPORT_DECLARATION)) names.add(match[1]);
  return [...names];
};

const checkExports = (
  context: { warn: (message: string) => void },
  id: string,
  code: string,
  names: string[],
): void => {
  if (UNSUPPORTED_EXPORT.test(code)) {
    context.warn(
      `${id}: only top-level \`export const <name> = …\` and \`export function <name>\` are supported in .action files; other export forms are ignored`,
    );
  }
  if (names.length === 0) {
    context.warn(`${id}: no action exports found`);
  }
};

/** Server side: append the registration of all exported functions. */
export const actionsServerRegister = (moduleName: string): Plugin => ({
  name: "jsm-actions-server",
  transform(code, id) {
    if (!isActionFile(id)) return;
    const names = extractActionExports(code);
    checkExports(this, id, code, names);
    if (names.length === 0) return;
    return {
      code: `${code}
;import { registerActionsModule as __jsmRegisterActionsModule } from "@jahia/javascript-modules-library";
__jsmRegisterActionsModule({ ${names.map((name) => `${JSON.stringify(name)}: ${name}`).join(", ")} }, ${JSON.stringify(moduleName)});
`,
      map: null,
    };
  },
});

/** Client side: replace the module with fetch stubs. */
export const actionsClientStub = (moduleName: string): Plugin => ({
  name: "jsm-actions-client",
  load(id) {
    const cleanId = id.split("?")[0];
    if (!isActionFile(cleanId)) return;
    const code = fs.readFileSync(cleanId, "utf-8");
    const names = extractActionExports(code);
    checkExports(this, cleanId, code, names);
    return `import { parse as __jsmParse, stringify as __jsmStringify } from "devalue";

const __jsmCall = (name) => async (...args) => {
  // strip the template extension from the page URL, then append the action extension
  const target = \`\${location.pathname.replace(/\\.html$/, "")}.jsAction.do?name=\${encodeURIComponent(name)}\`;
  const response = await fetch(target, {
    method: "POST",
    headers: { "X-JS-Action": "1", accept: "application/json" },
    body: __jsmStringify(args),
  });
  if (!response.ok) throw new Error(\`Action \${name} failed with HTTP \${response.status}\`);
  const payload = await response.json();
  if (payload.error) {
    const error = new Error(payload.error);
    if (payload.issues) error.issues = payload.issues;
    throw error;
  }
  return __jsmParse(payload.data);
};

${names.map((name) => `export const ${name} = __jsmCall(${JSON.stringify(`${moduleName}/${name}`)});`).join("\n")}
`;
  },
});
