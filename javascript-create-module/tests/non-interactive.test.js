import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexFile = path.join(path.dirname(__dirname), "index.js");

/** @type {string} */
let tempFolder;

before(() => {
  // Create a temporary directory
  tempFolder = fs.mkdtempSync(path.join(os.tmpdir(), "create-module-"));
});

after(() => {
  // Remove the temporary directory
  fs.rmSync(tempFolder, { recursive: true, force: true });
});

/**
 * Runs the CLI without any terminal attached: every stream is a pipe, and nothing is ever written
 * to stdin. A prompt would therefore hang forever, which the timeout turns into a test failure.
 *
 * @param {string[]} args CLI arguments
 * @param {{ cwd?: string; timeout?: number }} [options]
 * @returns {Promise<{ code: number | null; stdout: string; stderr: string }>}
 */
const run = async (args, { cwd = tempFolder, timeout = 5_000 } = {}) => {
  const child = spawn(process.execPath, [indexFile, ...args], {
    cwd,
    stdio: ["pipe", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf-8").on("data", (chunk) => (stdout += chunk));
  child.stderr.setEncoding("utf-8").on("data", (chunk) => (stderr += chunk));

  const timer = setTimeout(() => child.kill("SIGKILL"), timeout);
  const [code] = await once(child, "exit");
  clearTimeout(timer);

  assert.notEqual(
    code,
    null,
    `The CLI did not terminate within ${timeout}ms: it hung on a prompt.`,
  );

  return { code, stdout, stderr };
};

/** Creates an empty directory to scaffold into, and returns a path inside of it. */
const target = (/** @type {string} */ name) =>
  path.join(fs.mkdtempSync(path.join(tempFolder, "test-")), name);

test("Scaffolds a hello-world module without any prompt", async () => {
  const output = target("foo");
  const { code, stdout } = await run(["foo", "--template", "hello-world", "--path", output]);

  assert.equal(code, 0);
  assert.match(stdout, /Successfully created a new Jahia module project!/);

  // The module name is templated in package.json
  const pkg = JSON.parse(fs.readFileSync(path.join(output, "package.json"), "utf-8"));
  assert.equal(pkg.name, "foo");
  assert.equal(pkg.jahia.name, "foo");

  // The CND namespace is templated
  const cnd = fs.readFileSync(path.join(output, "settings", "definitions.cnd"), "utf-8");
  assert.match(cnd, /<foo = 'https:\/\/example\.com\/foo\/nt\/1\.0'>/);
  assert.doesNotMatch(cnd, /\$NAMESPACE|\$MODULE/);

  // Dotfiles and dotdirs have been renamed
  for (const file of [".env", ".gitignore", ".node-version", ".vscode/settings.json"]) {
    assert.ok(fs.existsSync(path.join(output, file)), file);
  }
  assert.ok(!fs.existsSync(path.join(output, "dot")));

  // Hello World components are there
  assert.ok(fs.existsSync(path.join(output, "src/components/Hello/World/default.server.tsx")));
});

test("Defaults the path to <cwd>/<name> with --yes", async () => {
  const cwd = fs.mkdtempSync(path.join(tempFolder, "test-"));
  const { code } = await run(["my-module", "--yes"], { cwd });

  assert.equal(code, 0);

  const output = path.join(cwd, "my-module");
  const pkg = JSON.parse(fs.readFileSync(path.join(output, "package.json"), "utf-8"));
  assert.equal(pkg.name, "my-module");

  // A hyphenated name gets a hyphen-free CND namespace
  const cnd = fs.readFileSync(path.join(output, "settings", "definitions.cnd"), "utf-8");
  assert.match(cnd, /<mymodule = 'https:\/\/example\.com\/my-module\/nt\/1\.0'>/);

  // --yes defaults to the hello-world preset
  assert.ok(fs.existsSync(path.join(output, "src/components/Hello/World/default.server.tsx")));
});

test("Scaffolds the template-set preset", async () => {
  const output = target("bar");
  const { code } = await run(["bar", "--template", "template-set", "--path", output]);

  assert.equal(code, 0);
  // Template set files are there…
  assert.ok(fs.existsSync(path.join(output, "src/templates/Page/basic.server.tsx")));
  assert.ok(fs.existsSync(path.join(output, "settings/template-thumbnail.png")));
  // …but not the Hello World ones
  assert.ok(!fs.existsSync(path.join(output, "src/components")));
});

test("Scaffolds the module preset", async () => {
  const output = target("baz");
  const { code } = await run(["baz", "--template", "module", "--path", output]);

  assert.equal(code, 0);
  // The bare module files are there…
  assert.ok(fs.existsSync(path.join(output, "settings/definitions.cnd")));
  assert.ok(fs.existsSync(path.join(output, "vite.config.mjs")));
  // …but neither the template set nor the Hello World ones
  assert.ok(!fs.existsSync(path.join(output, "src/templates")));
  assert.ok(!fs.existsSync(path.join(output, "src/components")));
});

test("Rejects an invalid module name", async () => {
  const output = target("invalid");
  const { code, stderr } = await run(["Foo!", "--path", output, "--yes"]);

  assert.equal(code, 1);
  // Same message as the wizard validator
  assert.match(stderr, /Module name must start with a lowercase letter\./);
  assert.ok(!fs.existsSync(output));
});

test("Rejects an existing output path", async () => {
  const output = target("existing");
  fs.mkdirSync(output);
  const { code, stderr } = await run(["foo", "--path", output, "--yes"]);

  assert.equal(code, 1);
  // Same message as the wizard validator
  assert.match(stderr, /Path already exists\. Please choose a different path\./);
  assert.deepEqual(fs.readdirSync(output), []);
});

test("Rejects an unknown template", async () => {
  const output = target("unknown");
  const { code, stderr } = await run(["foo", "--template", "nope", "--path", output]);

  assert.equal(code, 1);
  assert.match(stderr, /Unknown template "nope"/);
});

test("Fails fast without a terminal when an input is missing", async () => {
  // No flag at all: the wizard cannot run, the CLI must exit instead of waiting on stdin
  const { code, stderr } = await run([]);

  assert.equal(code, 1);
  assert.match(stderr, /Missing module name/);
  assert.match(stderr, /Usage:/);

  // A name is not enough either, the path and the template are still missing
  const partial = await run(["foo"]);
  assert.equal(partial.code, 1);
  assert.match(partial.stderr, /Usage:/);
});

test("Prints the usage with --help", async () => {
  const { code, stdout, stderr } = await run(["--help"]);

  assert.equal(code, 0);
  assert.match(stdout, /Usage:/);
  assert.match(stdout, /--template <preset>/);
  for (const template of ["hello-world", "template-set", "module"]) {
    assert.ok(stdout.includes(template), template);
  }
  assert.equal(stderr, "");
});
