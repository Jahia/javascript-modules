/**
 * Checks that the `eslint.config.js` shipped in the scaffolded module flags APIs that do not exist
 * in the Jahia server runtime (GraalJS) when they are used in server files, and leaves client files
 * alone.
 *
 * The scaffold is reproduced by copying the template files ESLint needs, and resolving its
 * dependencies through the monorepo `node_modules`, so the test doesn't have to install anything.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.dirname(testsDir);
const templateDir = path.join(packageDir, "templates", "module");
const repoRoot = path.dirname(packageDir);

const DOCS_URL =
  "https://github.com/Jahia/javascript-modules/blob/main/docs/3-reference/3-server-runtime-boundary/README.md";

/** @type {string} */
let projectDir;

before(() => {
  projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "jsm-eslint-"));

  // The two template files ESLint needs: the config itself, and the ignore file it reads
  fs.copyFileSync(
    path.join(templateDir, "eslint.config.js"),
    path.join(projectDir, "eslint.config.js"),
  );
  fs.copyFileSync(path.join(templateDir, "dot", "gitignore"), path.join(projectDir, ".gitignore"));
  fs.writeFileSync(path.join(projectDir, "package.json"), JSON.stringify({ type: "module" }));

  // Resolve eslint and its plugins from the monorepo instead of installing them again
  fs.symlinkSync(path.join(repoRoot, "node_modules"), path.join(projectDir, "node_modules"));

  fs.mkdirSync(path.join(projectDir, "src"), { recursive: true });
});

after(() => {
  fs.rmSync(projectDir, { recursive: true, force: true });
});

/**
 * Writes a file in the fake project and lints it.
 *
 * @param {string} file Path relative to the project root.
 * @param {string} content File content.
 * @returns {{ status: number | null; messages: { ruleId: string | null; message: string }[] }}
 */
function lint(file, content) {
  const filePath = path.join(projectDir, file);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);

  const eslint = spawnSync(
    process.execPath,
    [path.join(repoRoot, "node_modules", "eslint", "bin", "eslint.js"), "--format", "json", file],
    { cwd: projectDir, encoding: "utf8" },
  );

  assert.notEqual(eslint.stdout, "", `ESLint produced no output:\n${eslint.stderr}`);

  /** @type {{ messages: { ruleId: string | null; message: string }[] }[]} */
  const results = JSON.parse(eslint.stdout);
  return { status: eslint.status, messages: results.flatMap(({ messages }) => messages) };
}

test("server files report unavailable globals and Node.js imports", () => {
  const { status, messages } = lint(
    "src/probe.server.tsx",
    `import fs from "node:fs";
import path from "path";

export default function Probe() {
  setTimeout(() => {}, 1);
  fetch("https://example.com");
  return (
    <div>
      {fs.constants.F_OK} {path.sep} {process.env.SOME_VAR}
    </div>
  );
}
`,
  );

  assert.notEqual(status, 0, "ESLint should fail on a server file using unavailable APIs");

  const rules = messages.map(({ ruleId }) => ruleId);
  assert.ok(rules.includes("no-restricted-globals"), `Missing no-restricted-globals in ${rules}`);
  assert.ok(rules.includes("no-restricted-imports"), `Missing no-restricted-imports in ${rules}`);

  const globalMessages = messages
    .filter(({ ruleId }) => ruleId === "no-restricted-globals")
    .map(({ message }) => message);

  for (const name of ["setTimeout", "fetch", "process"]) {
    assert.ok(
      globalMessages.some(
        (message) =>
          message.includes(`'${name}'`) &&
          message.includes("Not available in the Jahia server runtime:"),
      ),
      `${name} should be reported, got ${JSON.stringify(globalMessages)}`,
    );
  }

  // Both the `node:` prefixed and the bare specifier must be caught
  assert.equal(
    messages.filter(({ ruleId }) => ruleId === "no-restricted-imports").length,
    2,
    "Both `node:fs` and `path` should be reported",
  );

  // Every message points to the reference page
  for (const { message } of messages.filter(({ ruleId }) =>
    ["no-restricted-globals", "no-restricted-imports"].includes(String(ruleId)),
  )) {
    assert.ok(message.endsWith(`See ${DOCS_URL}`), `Message does not link the docs: ${message}`);
  }
});

test("server files using available APIs pass", () => {
  const { status, messages } = lint(
    "src/clean.server.tsx",
    `export default function Clean({ name }: { name: string }) {
  console.log(new TextEncoder().encode(name));
  return <div>{name.toUpperCase()}</div>;
}
`,
  );

  assert.deepEqual(messages, []);
  assert.equal(status, 0);
});

test("client files are not restricted", () => {
  const { status, messages } = lint(
    "src/probe.client.tsx",
    `export default function Probe() {
  const onClick = () => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 1000);
    fetch(new URL("/api", window.location.href), { signal: controller.signal });
  };

  return <button onClick={onClick}>{document.title}</button>;
}
`,
  );

  assert.deepEqual(messages, []);
  assert.equal(status, 0);
});
