#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import camelCase from "camelcase";
import { styleText } from "node:util";

try {
  console.log(styleText("bgBlueBright", " Jahia JavaScript Module Creator "), "\n");

  const nodeVersion = Number(process.versions.node.split(".")[0]);

  if (nodeVersion < 22) {
    console.warn(
      `You are using ${styleText("redBright", `Node.js ${process.versions.node}`)} which is not officially supported.
Please upgrade to ${styleText("greenBright", "Node.js 22 or later")} if you encounter any issues.
Upgrade guide: ${styleText("underline", "https://nodejs.org/en/download")}
`,
    );
  }

  const name = process.argv[2];

  if (!name) {
    console.error(
      `No module name provided.

  Usage: npm init @jahia/module ${styleText("blueBright", "<module-name>")}

It will create a new module at this location with the provided name:

  ${path.join(process.cwd(), styleText("blueBright", "<module-name>"))}`,
    );
    process.exit(1);
  }

  // Module name and output directory
  const module = camelCase(name);
  const output = path.join(process.cwd(), name);

  console.log(`Creating a new Jahia module project...

  Module name: ${styleText("blueBright", module)}
  Path:        ${styleText("blueBright", output)}
`);

  /** Renames the `dot` directory to dotfiles and dotdirs. */
  const renameDot = (/** @type {string} */ name) =>
    name.startsWith(`dot${path.sep}`) ? `.${name.slice(4)}` : name;

  /** Replaces `$MODULE` with the actual module name. */
  const templatify = (/** @type {string} */ str) => str.replaceAll("$MODULE", module);

  // Copy the template to the output directory
  const input = fileURLToPath(new URL("template/", import.meta.url));
  for (const entry of fs.readdirSync(input, { recursive: true, withFileTypes: true })) {
    if (entry.isDirectory()) continue;

    const from = path.join(entry.parentPath, entry.name);
    const to = path.join(output, templatify(renameDot(path.relative(input, from))));

    // Ensure the parent directory exists
    fs.mkdirSync(path.dirname(to), { recursive: true });

    // Binary files are copied as is, text files are templated
    if (entry.name.endsWith(".png")) {
      fs.copyFileSync(from, to);
    } else {
      const contents = fs.readFileSync(from, "utf-8");
      fs.writeFileSync(to, templatify(contents));
    }
  }

  console.log(`${styleText("greenBright", "Successfully created a new Jahia module project!")}

Next steps:
  ${styleText("magentaBright", `cd ${name}`)}
  ${styleText("magentaBright", "yarn")}  ${styleText("dim", "# Install dependencies")}
  ${styleText("magentaBright", 'git init && git add . && git commit -m "chore: create module"')}  ${styleText(
    "dim",
    "# Commit all files",
  )}
  ${styleText("magentaBright", "code .")}  ${styleText("dim", "# Open the project in VSCode")}
  ${styleText("magentaBright", "yarn build && yarn dev")}  ${styleText("dim", "# Start the development server")}
`);
} catch (error) {
  console.error(
    `${styleText("bgRedBright", "Something went wrong")}

If you believe this is a bug, please report it at:
  ${styleText("underline", "https://github.com/Jahia/javascript-modules/issues")}
`,
    error,
  );
}
