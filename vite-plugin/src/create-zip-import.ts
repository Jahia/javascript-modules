import archiver from "archiver";
import fs from "fs";
import path from "path";
import type { Plugin } from "rollup";

export const createZipImportPlugin = (importDir: string, outputDir: string): Plugin => {
  return {
    name: "create-zip-import",
    closeBundle() {
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
  };
};
