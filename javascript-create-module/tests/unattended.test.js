import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
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

test("--help exits successfully", async () => {
  const { stdout } = await promisify(execFile)("node", [indexFile, "--help"]);

  assert.match(stdout, /--output/);
  assert.match(stdout, /--yes/);
});
