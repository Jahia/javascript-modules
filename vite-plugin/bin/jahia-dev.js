#!/usr/bin/env node
/**
 * `jahia dev` — the fast edit-to-visible loop for a JavaScript module.
 *
 * Jahia stays the front door and the renderer; this process owns the two things a redeploy is slow
 * at. It rebuilds the module on every change (`vite build --watch`, which is what `yarn watch`
 * already does), and then, instead of packing a tarball and asking the provisioning API to
 * reinstall the module:
 *
 * - It pushes `dist/server/index.js` into the running engine, which swaps it inside GraalVM;
 * - It serves `dist/` over HTTP, so the browser reads the client bundles, the stylesheet and the
 *   emitted assets from the build that just ran rather than from the installed bundle.
 *
 * Jahia reaches this process through the engine's development endpoint, so the browser only ever
 * talks to Jahia: no second origin, no CORS, and edit mode behaves as it always does.
 *
 * What the swap cannot reach still needs `yarn package && yarn deploy`: node type definitions,
 * imported content, locales, resource bundles, icons, OSGi configurations and package.json all come
 * from the installed bundle. This process says so when it sees one of them change.
 */
import { spawn } from "node:child_process";
import { createReadStream, existsSync, readFileSync, statSync, watch } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { styleText } from "node:util";
import dotenv from "dotenv";

dotenv.config();

const host = process.env.JAHIA_HOST || "http://localhost:8080";
const jahiaUrl = new URL(host.endsWith("/") ? host : `${host}/`);
const authorization = `Basic ${Buffer.from(process.env.JAHIA_USER || "root:root1234").toString("base64")}`;

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const moduleName = packageJson.name;
const distDir = path.resolve("dist");

if (!/^[a-z0-9][a-z0-9-]*$/.test(moduleName ?? "")) {
  console.error(
    `${styleText("red", "[jahia dev]")} "${moduleName}" cannot be a Jahia module name: Jahia derives the bundle's ` +
      `symbolic name from it, and the development endpoint addresses the module by that name in a URL. ` +
      `Use lowercase letters, digits and hyphens.`,
  );
  process.exit(1);
}
const serverBundle = path.join(
  distDir,
  packageJson.jahia?.server?.replace(/^dist\//, "") ?? "server/index.js",
);

/** Files the engine reads from the installed bundle, which a push therefore cannot refresh. */
const NEEDS_REDEPLOY = /\.cnd$|import\.xml$|^settings[/\\]|^locales[/\\]|^package\.json$/;

const MIME = {
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".map": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

const log = (message, ...args) =>
  console.log(`${styleText("cyan", "[jahia dev]")} ${message}`, ...args);
const fail = (message, ...args) => {
  console.error(`${styleText("red", "[jahia dev]")} ${message}`, ...args);
  process.exit(1);
};

/** Calls one of the engine's development commands for this module. */
async function command(name, { method = "POST", body, search } = {}) {
  const url = new URL(`modules/jsm-dev/${moduleName}/@jahia/${name}`, jahiaUrl);
  for (const [key, value] of Object.entries(search ?? {})) url.searchParams.set(key, value);
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: authorization,
      ...(body ? { "Content-Type": "application/javascript" } : {}),
    },
    body,
  });
  if (!response.ok) {
    throw new Error(
      `${response.status} ${response.statusText} — ${(await response.text()).slice(0, 400)}`,
    );
  }
  return response.headers.get("content-type")?.includes("json") ? response.json() : response.text();
}

// Serves the module's build output. Only what the engine asks for, and only under dist/: this
// answers requests Jahia forwards, so it must not become a way to read the developer's machine.
const fileServer = createServer((request, response) => {
  const requested = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const prefix = `/modules/jsm-dev/${moduleName}/`;
  const relative = requested.startsWith(prefix) ? requested.slice(prefix.length) : "";
  const file = path.resolve(distDir, relative.replace(/^dist\//, ""));

  if (process.env.JAHIA_DEV_TRACE) console.log(`[trace] ${requested} -> ${file}`);
  if (!file.startsWith(distDir + path.sep) || !existsSync(file) || !statSync(file).isFile()) {
    response.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": MIME[path.extname(file)] ?? "application/octet-stream",
    "Content-Length": statSync(file).size,
    "Cache-Control": "no-store",
  });
  createReadStream(file).pipe(response);
});

await new Promise((resolve) => fileServer.listen(Number(process.env.JAHIA_DEV_PORT) || 0, resolve));
const port = fileServer.address().port;

/**
 * Where Jahia can reach this process. Jahia in a container cannot resolve `localhost` to the host
 * it runs on, so the origin is tried and the container's usual name for the host is the fallback.
 */
async function attach() {
  const candidates = process.env.JAHIA_DEV_ORIGIN
    ? [process.env.JAHIA_DEV_ORIGIN]
    : [`http://localhost:${port}`, `http://host.docker.internal:${port}`];

  let lastError;
  for (const origin of candidates) {
    try {
      const session = await command("session", { search: { origin } });
      return { origin, base: session.base };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

let session;
try {
  session = await attach();
} catch (error) {
  fail(
    `Jahia refused the development session: ${error.message}\n` +
      `  • is ${jahiaUrl.href} running in development mode, with the engine's dev endpoint enabled?\n` +
      `      settings/configurations/org.jahia.modules.javascript.modules.engine.dev.DevServlet.cfg → enabled=true\n` +
      `  • is ${moduleName} deployed and started? the dev loop replaces a deployed module, it never installs one\n` +
      `  • if Jahia runs somewhere that cannot reach this machine, set JAHIA_DEV_ORIGIN`,
  );
}
log(
  "serving %s to Jahia as %s",
  styleText("underline", distDir),
  styleText("underline", session.origin),
);
log("attached to %s (%s)", styleText("underline", jahiaUrl.href), session.base);

const detach = async () => {
  try {
    await command("session", { method: "DELETE" });
  } catch {
    // Jahia may already be gone; a shutdown is not worth failing over
  }
};
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => void detach().then(() => process.exit(0)));
}

/**
 * Locates the `vite` binary the way Node resolves a package: this module's own `node_modules`
 * first, then every parent's, which is where a workspace keeps it.
 */
function findVite() {
  for (let dir = process.cwd(); ; dir = path.dirname(dir)) {
    const candidate = path.join(dir, "node_modules", ".bin", "vite");
    if (existsSync(candidate)) return candidate;
    if (path.dirname(dir) === dir) return "vite";
  }
}

/** Pushes the freshly built server bundle into the running engine. Open pages then reload. */
async function pushServerBundle(code) {
  const started = Date.now();
  try {
    const { ms } = await command("server-bundle", { body: code });
    log("reloaded in %s ms (engine: %s ms)", Date.now() - started, ms);
  } catch (error) {
    console.error(`${styleText("red", "[jahia dev]")} server bundle rejected: ${error.message}`);
  }
}

// The build is the module's own: same config, same plugins, same output the installed bundle has.
// Its watcher is the only file watcher here, and every rebuild ends in a push.
const viteBin = findVite();
const build = spawn(viteBin, ["build", "--watch"], {
  stdio: ["ignore", "pipe", "inherit"],
  // tells the plugin's watch callback to stand down: this process owns what happens after a build
  env: { ...process.env, JAHIA_DEV: "1" },
});
build.on("error", (error) => fail(`Cannot start the build: ${error.message}`));
build.on("exit", (code) => fail(`The build exited with code ${code}`));

build.stdout.on("data", (chunk) => process.stdout.write(chunk));

// The build writes the server bundle once per rebuild, but prints "built in" once per environment,
// so the file is the signal and its log is not. Pushes never overlap: a swap bumps the engine's
// context version, and two of them racing leaves the pool unable to validate any context.
let pushing = false;
let pending = false;
let lastPushed = "";

async function onServerBundleChanged() {
  if (pushing) {
    pending = true;
    return;
  }
  pushing = true;
  try {
    do {
      pending = false;
      const built = existsSync(serverBundle) ? readFileSync(serverBundle) : null;
      const fingerprint = built ? `${built.length}:${statSync(serverBundle).mtimeMs}` : "";
      if (built && fingerprint !== lastPushed) {
        lastPushed = fingerprint;
        await pushServerBundle(built);
      }
    } while (pending);
  } finally {
    pushing = false;
  }
}

const debounce = (fn, ms) => {
  let timer;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
};
const serverBundleChanged = debounce(() => void onServerBundleChanged(), 50);
watch(path.dirname(serverBundle), () => serverBundleChanged());
serverBundleChanged();

// The build only watches what it builds. Everything else in a module reaches Jahia through the
// installed bundle, so a developer editing it would otherwise see nothing happen at all.
watch(".", { recursive: true }, (_event, filename) => {
  if (!filename || filename.startsWith("dist") || filename.startsWith("node_modules")) return;
  if (!NEEDS_REDEPLOY.test(filename)) return;
  log(
    styleText(
      "yellow",
      "%s is read from the installed bundle: run `yarn package && yarn deploy` to apply it",
    ),
    filename,
  );
});

log("watching for changes — %s", styleText("dim", "Ctrl-C to detach"));
