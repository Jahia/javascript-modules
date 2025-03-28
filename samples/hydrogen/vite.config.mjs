import { defineConfig } from "vite";
import jahia from "@jahia/vite-plugin";
import { spawnSync } from "node:child_process";
import archiver from "archiver";
import fs from "fs";
import path from "path";

export default defineConfig({
  plugins: [
    jahia({
      client: {
        input: {
          dir: "./src/",
          glob: "**/*.client.{jsx,tsx}",
        },
        output: "./dist/",
      },
      server: {
        // You can use a glob pattern to match multiple files
        input: "./src/**/*.server.{jsx,tsx}",
        output: {
          dir: "./dist/server/",
          fileName: "index", // Will produce index.js and style.css (because of a bug)
        },
      },
      // This function is called every time a build succeeds in watch mode
      watchCallback() {
        spawnSync("yarn", ["watch:callback"], { stdio: "inherit", shell: true });
      },
    }),
    // custom plugin to import the site:
    // TODO see why executed twice
    {
      name: "create-zip-import",
      closeBundle() {
        const importDir = "./import/";
        const outputDir = "./dist/";
        if (fs.existsSync(importDir) && fs.readdirSync(importDir).length > 0) {
          const output = fs.createWriteStream(path.join(outputDir, "import.zip"));
          const archive = archiver("zip", {
            zlib: { level: 9 },
          });

          output.on("close", () => {
            console.log(`Created ${output.path} with ${archive.pointer()} total bytes`);
          });

          archive.on("error", (err) => {
            throw err;
          });

          archive.pipe(output);
          archive.directory(importDir, false);
          archive.finalize();
        } else {
          console.log(`No files to archive in ${importDir}.`);
        }
      },
    },
  ],
});
