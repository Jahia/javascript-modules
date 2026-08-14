#!/usr/bin/env node
import * as prompts from "@clack/prompts";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parseArgs, styleText } from "node:util";
import pkg from "./package.json" with { type: "json" };

/**
 * The module presets: single source of truth, shared by the interactive wizard and the `--template`
 * flag. Each preset is a list of templates copied on top of each other, in order.
 */
const TEMPLATES = {
  "hello-world": {
    // This module is created by combining 3 templates:
    templates: ["module", "template-set", "hello-world"],
    label: "A minimal Hello World template set",
    hint: "Recommended for discovery",
  },
  "template-set": {
    templates: ["module", "template-set"],
    label: "An empty template set",
    hint: "You want to start from scratch",
  },
  "module": {
    templates: ["module"],
    label: "An empty module",
    hint: "Slightly more than an empty directory",
  },
};

/** Preset used when `--yes` is passed without `--template`. */
const DEFAULT_TEMPLATE = "hello-world";

/** Validates a module name, returns an error message when it is invalid. */
const validateName = (/** @type {string} */ value) => {
  if (!/^[a-z]/.test(value)) return "Module name must start with a lowercase letter.";
  if (!/^[a-z0-9-]+$/.test(value))
    return "Module name can only contain lowercase letters, numbers, and hyphens.";
};

/** Validates an output path, returns an error message when it is invalid. */
const validatePath = (/** @type {string} */ value) => {
  if (value.trim() === "") return "Path cannot be empty.";
  if (fs.existsSync(value)) return "Path already exists. Please choose a different path.";
};

/** Renames the `dot` directory to dotfiles and dotdirs. */
const renameDot = (/** @type {string} */ name) =>
  name.startsWith(`dot${path.sep}`) ? `.${name.slice(4)}` : name;

const usage = `Jahia JavaScript Module Creator

Usage:
  npm init @jahia/module@latest [name] -- [options]

Arguments:
  name                     Module name, lowercase letters, digits and hyphens only

Options:
  -t, --template <preset>  Module preset: ${Object.keys(TEMPLATES).join(" | ")} (default: ${DEFAULT_TEMPLATE})
  -p, --path <dir>         Directory to create the module in (default: ./<name>)
  -y, --yes                Use the defaults for everything not passed as a flag
  -i, --interactive        Force the interactive wizard, even without a terminal
  -h, --help               Print this help message

Examples:
  # Interactive wizard
  npm init @jahia/module@latest

  # Fully unattended, creates ./my-module
  npm init @jahia/module@latest my-module -- --template hello-world --yes
`;

/**
 * Prints an error message followed by the usage on stderr, then exits with code 1.
 *
 * @returns {never}
 */
const fail = (/** @type {string} */ message) => {
  console.error(`Error: ${message}\n`);
  console.error(usage);
  process.exit(1);
};

// The IIFE (instead of let + try/catch) keeps parseArgs' inference on the literal options config,
// so args.values gets precise per-flag types instead of string | boolean | (string | boolean)[]
const args = (() => {
  try {
    return parseArgs({
      args: process.argv.slice(2),
      allowPositionals: true,
      options: {
        template: { type: "string", short: "t" },
        path: { type: "string", short: "p" },
        yes: { type: "boolean", short: "y" },
        interactive: { type: "boolean", short: "i" },
        help: { type: "boolean", short: "h" },
      },
    });
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
})();

if (args.values.help) {
  console.log(usage);
  process.exit(0);
}

if (args.positionals.length > 1) {
  fail(`Unexpected argument: ${args.positionals[1]}`);
}

/**
 * Whether prompts can be displayed: a terminal on both ends is required (prompts READ from stdin
 * and write to stdout), unless the wizard was explicitly requested. Without it, a missing input is
 * a hard error instead of a prompt: this CLI must never hang in a script or a CI pipeline.
 */
const canPrompt =
  Boolean(process.stdin.isTTY && process.stdout.isTTY) || args.values.interactive === true;

/** Whether any flag resolving one of the inputs was passed. */
const hasFlags =
  args.values.template !== undefined || args.values.path !== undefined || args.values.yes === true;

/**
 * Whether to run the full wizard, asking every question. This is the historical behavior, kept
 * as-is when no flag is passed: the positional argument then only prefills the first prompt.
 */
const wizard = args.values.interactive === true || (!hasFlags && canPrompt);

// Resolve and validate everything coming from the command line before printing anything
let module = /** @type {string | undefined} */ (args.positionals[0]);
let output = args.values.path;
let template = args.values.template;

// In wizard mode the name prompt re-validates its prefill and lets the user correct it — the
// historical behavior; only fail hard when no prompt will ask again.
if (module !== undefined && !wizard) {
  const error = validateName(module);
  if (error) fail(error);
}

if (template !== undefined && !Object.hasOwn(TEMPLATES, template)) {
  fail(`Unknown template "${template}", expected one of: ${Object.keys(TEMPLATES).join(", ")}.`);
}

if (output !== undefined) {
  const error = validatePath(output);
  if (error) fail(error);
}

// `--yes` fills in the default for everything that was not passed
if (args.values.yes) template ??= DEFAULT_TEMPLATE;

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

  if (wizard || module === undefined) {
    if (!canPrompt) fail("Missing module name, pass it as an argument.");

    const answer = await prompts.text({
      message: "What is the name of your module?",
      placeholder: "a-z, 0-9 and - only",
      initialValue: module,
      validate: validateName,
    });

    if (prompts.isCancel(answer)) {
      prompts.cancel("See you soon!");
      process.exit(0);
    }

    module = answer;
  }

  if (wizard || output === undefined) {
    const defaultOutput = path.join(process.cwd(), module);

    if (!wizard && args.values.yes) {
      // `--yes` accepts the default path
      const error = validatePath(defaultOutput);
      if (error) fail(error);
      output = defaultOutput;
    } else {
      if (!canPrompt) fail("Missing output path, pass --path <dir> or --yes.");

      const answer = await prompts.text({
        message: "Where do you want to create the module?",
        initialValue: output ?? defaultOutput,
        validate: validatePath,
      });

      if (prompts.isCancel(answer)) {
        prompts.cancel("Goodbye!");
        process.exit(0);
      }

      output = answer;
    }
  }

  if (wizard || template === undefined) {
    if (!canPrompt) fail("Missing template, pass --template <preset> or --yes.");

    const answer = await prompts.select({
      message: "Which module type do you want?",
      initialValue: template,
      options: Object.entries(TEMPLATES).map(([value, { label, hint }]) => ({
        value,
        label,
        hint,
      })),
    });

    if (prompts.isCancel(answer)) {
      prompts.cancel("Have a nice day!");
      process.exit(0);
    }

    template = answer;
  }

  // Both are definitely assigned here: resolved from the command line or prompted just above
  const moduleName = /** @type {string} */ (module);
  const templateName = /** @type {keyof typeof TEMPLATES} */ (template);

  /** Replaces `$MODULE` with the actual module name. */
  const templatify = (/** @type {string} */ str) =>
    str
      .replaceAll("$MODULE", moduleName)
      // A CND namespace cannot contain hyphens
      .replaceAll("$NAMESPACE", moduleName.replaceAll("-", ""))
      .replaceAll("$VERSION", pkg.version);

  for (const name of TEMPLATES[templateName].templates) {
    // Copy the template to the output directory
    const input = fileURLToPath(new URL(`templates/${name}/`, import.meta.url));
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
