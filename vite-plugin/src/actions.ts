import fs from "node:fs";
import type { Plugin } from "rolldown";

/**
 * Support for `.action.ts` files: functions written once, executed on the server, callable from
 * client code as if they were local async functions.
 *
 * Action files are compiled twice:
 *
 * - In the server bundle, the file is kept as-is and a registration call is appended, so every
 *   exported function becomes a callable action (`__registerActionsModule`, internal to the
 *   library).
 * - In the client bundle, the file is replaced by generated fetch stubs (one per export) that POST
 *   devalue-serialized arguments to the engine's generic action endpoint.
 *
 * Export discovery is intentionally simple (v1): only top-level `export const <name> = …` / `export
 * function <name>` / `export async function <name>` declarations are supported.
 */

// keep in sync with the default `actions.inputGlob` of the plugin (index.ts)
const ACTION_FILE = /\.action\.(ts|js)$/;
const EXPORT_DECLARATION = /^export\s+(?:const|async\s+function|function)\s+([A-Za-z_$][\w$]*)/gm;
const UNSUPPORTED_EXPORT = /^export\s*(?:\{|\*|default\b)|^export\s+let\b/m;

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
;import { __registerActionsModule as __jsmRegisterActionsModule } from "@jahia/javascript-modules-library";
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
    // the endpoint (GenericActionEndpoint) only checks the header's presence, not its value
    headers: { "X-JS-Action": "1", accept: "application/json" },
    body: __jsmStringify(args),
  });
  // The endpoint answers with a JSON envelope whatever the outcome, so the body is read before the
  // status is considered: failures carry their message — and their validation issues — in there
  const payload = await response.json().catch(() => null);
  if (payload?.error) {
    const error = new Error(payload.error);
    if (payload.issues) error.issues = payload.issues;
    throw error;
  }
  if (!response.ok || !payload) {
    throw new Error(\`Action \${name} failed with HTTP \${response.status}\`);
  }
  return __jsmParse(payload.data);
};

${names.map((name) => `export const ${name} = __jsmCall(${JSON.stringify(`${moduleName}/${name}`)});`).join("\n")}
`;
  },
});
