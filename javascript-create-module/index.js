#!/usr/bin/env node
import * as prompts from "@clack/prompts";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { styleText } from "node:util";
import pkg from "./package.json" with { type: "json" };

/** Renames the `dot` directory to dotfiles and dotdirs. */
const renameDot = (/** @type {string} */ name) =>
  name.startsWith(`dot${path.sep}`) ? `.${name.slice(4)}` : name;

try {
  prompts.intro("Jahia JavaScript Module Creator");

  const nodeVersion = Number(process.versions.node.split(".")[0]);

  if (nodeVersion < 22) {
    prompts.log.warn(
      `You are using ${styleText("redBright", `Node.js ${process.versions.node}`)} which is not officially supported.
Please upgrade to ${styleText("greenBright", "Node.js 22 or later")} if you encounter any issues.
Upgrade guide: ${styleText("underline", "https://nodejs.org/en/download")}
`,
    );
  }

  const module = await prompts.text({
    message: "What is the name of your module?",
    placeholder: "a-z, 0-9 and - only",
    initialValue: process.argv[2],
    validate(value) {
      if (!/^[a-z]/.test(value)) return "Module name must start with a lowercase letter.";
      if (!/^[a-z0-9-]+$/.test(value))
        return "Module name can only contain lowercase letters, numbers, and hyphens.";
    },
  });

  if (prompts.isCancel(module)) {
    prompts.cancel("See you soon!");
    process.exit(0);
  }

  const output = await prompts.text({
    message: "Where do you want to create the module?",
    initialValue: path.join(process.cwd(), module),
    validate(value) {
      if (value.trim() === "") return "Path cannot be empty.";
      if (fs.existsSync(value)) return "Path already exists. Please choose a different path.";
    },
  });

  if (prompts.isCancel(output)) {
    prompts.cancel("Goodbye!");
    process.exit(0);
  }

  const templates = await prompts.select({
    message: "Which module type do you want?",
    options: [
      {
        // This module is created by combining 3 templates:
        value: ["module", "template-set", "hello-world"],
        label: "A minimal Hello World template set",
        hint: "Recommended for discovery",
      },
      {
        value: ["module", "template-set"],
        label: "An empty template set",
        hint: "You want to start from scratch",
      },
      {
        value: ["module"],
        label: "An empty module",
        hint: "Slightly more than an empty directory",
      },
    ],
  });

  if (prompts.isCancel(templates)) {
    prompts.cancel("Have a nice day!");
    process.exit(0);
  }

  /** Replaces `$MODULE` with the actual module name. */
  const templatify = (/** @type {string} */ str) =>
    str
      .replaceAll("$MODULE", module)
      // A CND namespace cannot contain hyphens
      .replaceAll("$NAMESPACE", module.replaceAll("-", ""))
      .replaceAll("$VERSION", pkg.version);

  for (const template of templates) {
    // Copy the template to the output directory
    const input = fileURLToPath(new URL(`templates/${template}/`, import.meta.url));
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
  }

  prompts.outro(`${styleText("greenBright", "Successfully created a new Jahia module project!")}

Run the following commands to get started:
  ${styleText("dim", "1.")} ${styleText("greenBright", `cd ${output}`)}
  ${styleText("dim", "2.")} ${styleText("cyanBright", "yarn install")}              ${styleText("dim", "# Install dependencies")}
  ${styleText("dim", "3.")} ${styleText("blueBright", "docker compose up --wait")}  ${styleText("dim", "# Start Jahia in Docker")}
  ${styleText("dim", "4.")} ${styleText("magentaBright", "yarn dev")}                  ${styleText("dim", "# Start the dev mode")}

The ${styleText("underline", "README.md")} file contains a reminder of all commands.
`);
} catch (error) {
  prompts.cancel(
    `${styleText("bgRedBright", "Something went wrong")}

If you believe this is a bug, please report it at:
  ${styleText("underline", "https://github.com/Jahia/javascript-modules/issues")}
`,
  );
  console.error(error);
  process.exit(1);
}
