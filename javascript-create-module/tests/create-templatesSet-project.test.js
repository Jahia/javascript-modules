import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as tar from "tar";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const testCases = [
  ["test-project", "testProject", "templatesSet"],
  ["otherSampleProject", "otherSampleProject", "module"],
  ["foo", "foo", ""],
];

for (const [projectName, projectNameSanitized, moduleType] of testCases) {
  test(`Project creation using archetype ('${projectName}'/'${projectNameSanitized}' with moduleType '${moduleType}')`, async () => {
    // Create a temporary directory
    const tempDir = fs.mkdtempSync(path.join(tempFolder, projectNameSanitized));
    console.log("tempDir", tempDir);

    const parentFolder = path.dirname(__dirname);
    const indexFile = path.join(parentFolder, "index.js");
    const isTemplatesSet = moduleType === "templatesSet";

    // Create a new test-project from within the temp directory
    process.chdir(tempDir);
    console.log(execSync(`node ${indexFile} ${projectName} ${moduleType}`).toString());
    const projectPath = path.join(tempDir, projectName);
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
      ".idea/jsLinters/eslint.xml",
      ".idea/prettier.xml",
      ".vscode/settings.json",
      "eslint.config.js",
      // Make sure the renaming with MODULE_NAME is correct
      `settings/resources/${projectName}.properties`,
      `settings/resources/${projectName}_fr.properties`,
      `settings/content-types-icons/${projectNameSanitized}_simpleContent.png`,
      // Make sure the static and config folders exist
      "static/css",
      "static/images",
      "static/javascript",
      "settings/configurations",
      "settings/content-editor-forms/forms",
      "settings/content-editor-forms/fieldsets",
      "yarn.lock",
    ];
    if (moduleType === "templatesSet") {
      // This file should only exist for templates set
      expectedFiles.push("settings/template-thumbnail.png");
    }

    for (const file of expectedFiles) {
      console.log(`Testing that ${file} exists...`);
      assert(fs.existsSync(path.join(projectPath, file)));
    }

    // Install & build the project
    process.chdir(projectPath);
    // YARN_ENABLE_IMMUTABLE_INSTALLS=false is used as the yarn.lock file gets updated
    // Without this flag, the following error is encountered: "The lockfile would have been created by this install, which is explicitly forbidden."
    console.log(execSync("YARN_ENABLE_IMMUTABLE_INSTALLS=false yarn install").toString());
    console.log(execSync("yarn build").toString());

    // Make sure the tgz file is created in the dist/ folder
    const tgzFilePath = path.join(projectPath, "dist", "package.tgz");
    assert(fs.existsSync(tgzFilePath));

    // Check the contents of the tgz file
    const expectedFilesInArchive = [
      "dist/client/index.jsx.js",
      "dist/server/index.js",
      "dist/server/style.css", // TODO: It should be index.css, not style.css
      `settings/content-types-icons/${projectNameSanitized}_simpleContent.png`,
      "settings/locales/de.json",
      "settings/locales/en.json",
      "settings/locales/fr.json",
      `settings/resources/${projectName}.properties`,
      `settings/resources/${projectName}_fr.properties`,
      "settings/definitions.cnd",
      "settings/import.xml",
      "settings/README.md",
      isTemplatesSet && "settings/template-thumbnail.png",
      "static/css/styles.css",
      "package.json",
      "README.md",
    ].filter(Boolean);

    const entries = [];
    tar.list({
      file: tgzFilePath,
      sync: true,
      onReadEntry: (entry) => {
        // This is the only way to get the list of files, this lib is nuts
        entries.push(entry.path);
      },
    });

    for (const file of expectedFilesInArchive) {
      console.log(`Testing that ${file} exists in the archive...`);
      assert(entries.includes(`package/${file}`), file);
    }
    assert.equal(entries.length, expectedFilesInArchive.length);

    // Make sure the package.json contains the dependency @jahia/javascript-modules-library
    const packageJson = JSON.parse(fs.readFileSync(path.join(projectPath, "package.json"), "utf8"));
    assert(packageJson.devDependencies["@jahia/javascript-modules-library"]);
  });
}
