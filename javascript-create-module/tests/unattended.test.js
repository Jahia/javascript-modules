import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { setTimeout } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexFile = path.join(__dirname, "..", "index.js");

/** @type {string} */
let tempFolder;

before(() => {
  tempFolder = fs.mkdtempSync(path.join(os.tmpdir(), "create-module-"));
});

after(() => {
  fs.rmSync(tempFolder, { recursive: true, force: true });
});

test("--yes creates a project without any prompt", async () => {
  const output = path.join(tempFolder, "empty-module");

  // Nothing is ever written to stdin: the CLI must not ask anything
  await promisify(execFile)("node", [
    indexFile,
    "my-module",
    "--template",
    "module",
    "--output",
    output,
    "--yes",
  ]);

  assert(fs.existsSync(path.join(output, "package.json")));
  // An empty module has no template set
  assert(!fs.existsSync(path.join(output, "src", "templates")));
  assert.match(fs.readFileSync(path.join(output, "package.json"), "utf-8"), /"my-module"/);
});

test("--yes rejects an invalid module name", async () => {
  const error = await promisify(execFile)("node", [indexFile, "Invalid Name", "--yes"], {
    cwd: tempFolder,
  }).catch((error) => error);

  assert.equal(error.code, 1);
  assert.match(error.stderr, /must start with a lowercase letter/);
});

test("--template rejects an unknown template", async () => {
  const error = await promisify(execFile)(
    "node",
    [indexFile, "my-module", "--template", "nope", "--yes"],
    {
      cwd: tempFolder,
    },
  ).catch((error) => error);

  assert.equal(error.code, 1);
  assert.match(error.stderr, /Invalid module type/);
});

test("--yes requires a module name", async () => {
  const error = await promisify(execFile)("node", [indexFile, "--yes"], {
    cwd: tempFolder,
  }).catch((error) => error);

  assert.equal(error.code, 1);
  assert.match(error.stderr, /Name is required in non-interactive mode/i);
});

test("prompts that cannot be answered fail fast", async () => {
  // stdio is piped, so stdin is not a TTY: the CLI must not wait for an answer
  const error = await promisify(execFile)("node", [indexFile, "my-module"], {
    cwd: tempFolder,
    timeout: 5000,
  }).catch((error) => error);

  // A timeout would kill the process with a signal instead of an exit code
  assert.equal(error.code, 1);
  assert.match(error.stderr, /require an interactive terminal/);
  assert.match(error.stderr, /--yes/);
});

test("flags pre-fill the prompts when they are not skipped", async () => {
  const output = path.join(tempFolder, "prefilled-module");

  const child = spawn(
    "node",
    [
      // Pretend stdin is interactive, as spawning creates a non-interactive stdin
      "--import",
      new URL("fake-tty.js", import.meta.url).href,
      indexFile,
      "my-module",
      "--template",
      "module",
      "--output",
      output,
    ],
    { stdio: ["pipe", "ignore", "inherit"] },
  );

  // Press enter three times to accept the pre-filled values
  for (let i = 0; i < 3; i++) {
    await setTimeout(200);
    child.stdin.write("\r");
  }
  child.stdin.end();

  const [code] = await once(child, "exit");
  assert.equal(code, 0);
  assert(fs.existsSync(path.join(output, "package.json")));
  // --template module was pre-selected, an empty module has no template set
  assert(!fs.existsSync(path.join(output, "src", "templates")));
});

test("--help exits successfully", async () => {
  const { stdout } = await promisify(execFile)("node", [indexFile, "--help"]);

  assert.match(stdout, /--output/);
  assert.match(stdout, /--yes/);
});
