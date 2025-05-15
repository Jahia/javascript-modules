import fs from "node:fs";
import path from "node:path";
import pkg from "./package.json" with { type: "json" };

/** Input directory. */
const input = "playground";
const ignore = /^(\.yarn\/|dist\/|node_modules\/|yarn\.lock)|\.DS_Store/;

/** Resolves a file path relative to the template directory. */
const resolveTemplate = (/** @type {string} */ path) =>
  new URL(`template/${path}`, import.meta.url);

/** Renames dotfiles and dotdirs to the `dot` directory. */
const renameDot = (/** @type {string} */ name) =>
  name.startsWith(".") ? path.join("dot", name.slice(1)) : name;

/** Replaces `playground` with `$MODULE`. */
const templatify = (/** @type {string} */ str) =>
  str.replaceAll("playground", "$MODULE").replaceAll(pkg.version, "$VERSION");

// Recursively copy files from the input directory to the template directory
for (const entry of fs.readdirSync(input, { recursive: true, withFileTypes: true })) {
  // Skip directories, only create directories when there are files inside
  if (entry.isDirectory()) continue;

  const name = path.join(path.relative(input, entry.parentPath), entry.name);
  if (ignore.test(name)) continue;

  const from = path.join(entry.parentPath, entry.name);
  const to = resolveTemplate(templatify(renameDot(name)));

  // Ensure the parent directory exists
  fs.mkdirSync(new URL(".", to), { recursive: true });

  // Binary files are copied as is, text files are templatified
  if (entry.name.endsWith(".png")) {
    fs.copyFileSync(from, to);
  } else {
    const contents = fs.readFileSync(from, "utf-8");
    fs.writeFileSync(to, templatify(contents));
  }
}
