import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { setTimeout } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {string} */
let tempFolder;

before(() => {
  // Create a temporary directory
  tempFolder = fs.mkdtempSync(os.tmpdir());
  console.log("Using temp folder ", tempFolder);
});

after(() => {
  // Remove the temporary directory
  fs.rmSync(tempFolder, { recursive: true, force: true });
  console.log(`Temp folder ${tempFolder} removed.`);
});

test("Project creation", async () => {
  // Create a temporary directory
  const tempDir = fs.mkdtempSync(tempFolder);
  console.log("tempDir", tempDir);

  const parentFolder = path.dirname(__dirname);
  const indexFile = path.join(parentFolder, "index.js");

  // Create a new test-project from within the temp directory
  process.chdir(tempDir);

  // Because the CLI is interactive, we use spawn it and interact with it
  const child = spawn("node", [indexFile, "project-name"], {
    stdio: ["pipe", "inherit", "inherit"],
  });

  // Press enter three times to confirm the default values
  await setTimeout(100);
  child.stdin.write("\r");
  await setTimeout(100);
  child.stdin.write("\r");
  await setTimeout(100);
  child.stdin.write("\r");
  child.stdin.end();
  await once(child, "exit");

  const projectPath = path.join(tempDir, "project-name");
  assert(fs.existsSync(projectPath));

  // TODO check the replacement of the markers in the files

  // Validate the generated project structure
  const expectedFiles = [
    // Make sure the dot files have been renamed
    ".env",
    ".gitignore",
    ".prettierignore",
    ".yarnrc.yml",
    ".github/workflows/build.yml",
    ".idea/prettier.xml",
    ".vscode/extensions.json",
    ".vscode/settings.json",
    "eslint.config.js",
    "docker-compose.yml",
    "docker/provisioning.yml",
    // Make sure the renaming with MODULE_NAME is correct
    "settings/resources/project-name.properties",
    "settings/resources/project-name_fr.properties",
    "settings/content-types-icons/project-namemix_component.png",
    "settings/content-types-icons/project-name_helloWorld.png",
    "settings/content-types-icons/project-name_helloCard.png",
    "settings/content-types-icons/project-name_languageSwitcher.png",
    // Make sure the static and config folders exist
    "static/illustrations/code.svg",
    "static/illustrations/coffee.svg",
    "static/illustrations/interface.svg",
    "static/illustrations/read.svg",
    "static/illustrations/write.svg",
    "settings/locales/en.json",
    "settings/locales/fr.json",
    "settings/template-thumbnail.png",
  ];

  for (const file of expectedFiles) {
    assert(fs.existsSync(path.join(projectPath, file)), file);
  }
});
