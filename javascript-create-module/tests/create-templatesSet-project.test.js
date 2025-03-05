import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
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
  console.log(execSync(`node ${indexFile} project-name`).toString());
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
    // Make sure the renaming with MODULE_NAME is correct
    `settings/resources/projectName.properties`,
    `settings/resources/projectName_fr.properties`,
    `settings/content-types-icons/projectName_component.png`,
    `settings/content-types-icons/projectName_HelloWorld.png`,
    `settings/content-types-icons/projectName_HelloCard.png`,
    `settings/content-types-icons/projectName_LanguageSwitcher.png`,
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
