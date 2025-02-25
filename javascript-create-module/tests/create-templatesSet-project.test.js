import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import * as tar from "tar";
import each from "jest-each";

let tempFolder;

beforeAll(() => {
  // Create a temporary directory
  tempFolder = fs.mkdtempSync(os.tmpdir());
  console.log("Using temp folder ", tempFolder);
});

afterAll(() => {
  // Remove the temporary directory
  fs.rmSync(tempFolder, { recursive: true, force: true });
  console.log(`Temp folder ${tempFolder} removed.`);
});

describe("npx @jahia/create-module", () => {
  each([
    ["test-project", "testProject", "templatesSet"],
    ["otherSampleProject", "otherSampleProject", "module"],
    ["foo", "foo", ""],
  ]).it(
    "Project creation using archetype ('%s'/'%s' with moduleType '%s')",
    async (projectName, projectNameSanitized, moduleType) => {
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
      expect(fs.existsSync(projectPath)).toBe(true);

      // TODO check the replacement of the markers in the files

      // Validate the generated project structure
      const expectedFiles = [
        // Make sure the dot files have been renamed
        ".gitignore",
        ".npmignore",
        ".env",
        ".eslintrc.cjs",
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

      expectedFiles.forEach((file) => {
        console.log(`Testing that ${file} exists...`);
        expect(fs.existsSync(path.join(projectPath, file))).toBe(true);
      });

      // Install & build the project
      process.chdir(projectPath);
      // YARN_ENABLE_IMMUTABLE_INSTALLS=false is used as the yarn.lock file gets updated
      // Without this flag, the following error is encountered: "The lockfile would have been created by this install, which is explicitly forbidden."
      console.log(execSync("YARN_ENABLE_IMMUTABLE_INSTALLS=false yarn install").toString());
      console.log(execSync("yarn build").toString());

      // Make sure the tgz file is created in the dist/ folder
      const tgzFilePath = path.join(projectPath, "dist", "package.tgz");
      expect(fs.existsSync(tgzFilePath)).toBe(true);

      // Check the contents of the tgz file
      const expectedFilesInArchive = [
        "javascript/client/remote.js",
        "javascript/client/remote.js.map",
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
        "main.js",
        "main.js.map",
        "package.json",
      ].filter(Boolean);

      const entries = [];
      await tar
        .list({
          file: tgzFilePath,
          onReadEntry: (entry) => {
            entries.push(entry.path);
          },
        })
        .then(() => {
          expectedFilesInArchive.forEach((file) => {
            console.log(`Testing that ${file} exists in the archive...`);
            expect(entries.includes(`package/${file}`)).toBe(true);
          });
          expect(entries.length).toBe(expectedFilesInArchive.length);
        });

      // Make sure the package.json contains the dependency @jahia/javascript-modules-library
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(projectPath, "package.json"), "utf8"),
      );
      expect(packageJson.dependencies["@jahia/javascript-modules-library"]).toBeDefined();
    },
  );
});
