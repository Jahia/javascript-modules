#!/usr/bin/env node
import dotenv from "dotenv";
import * as fs from "node:fs";
import { inspect, styleText } from "node:util";

// Load environment variables from .env file
dotenv.config();

// Deprecation warning for JAHIA_DEPLOY_METHOD
const deployMethod = process.env.JAHIA_DEPLOY_METHOD || "curl";
if (deployMethod !== "curl") {
  console.warn(
    styleText(
      "yellow",
      'JAHIA_DEPLOY_METHOD environment is now ignored and will always be "curl". You can safely remove it from your .env file.',
    ),
  );
}

// Ensure the package was built prior to deployment
if (!fs.existsSync("./dist/package.tgz")) {
  console.error(
    styleText(
      "red",
      "The package.tgz file does not exist in the dist directory. Please run `yarn package` first.",
    ),
  );
  process.exit(1);
}

// Prepare the payload for the provisioning API
// https://academy.jahia.com/documentation/jahia-cms/jahia-8.2/dev-ops/provisioning/provisioning-commands
const body = new FormData();
body.append(
  "script",
  JSON.stringify([
    {
      installOrUpgradeBundle: "package.tgz",
      // Skip CND breaking change prevention by default
      ignoreChecks: (process.env.JAHIA_IGNORE_CHECKS || "true") !== "false",
    },
  ]),
);
body.append("file", new File([fs.readFileSync("./dist/package.tgz")], "package.tgz"));

// Send the payload to the Jahia provisioning API
const host = process.env.JAHIA_HOST || "http://localhost:8080";
// use a relative path to the base URL that should end with a slash (to support custom context paths)
const provisioningUrl = new URL("modules/api/provisioning", host.endsWith("/") ? host : `${host}/`);
console.log(`Deploying the package to Jahia (${styleText("underline", "%s")})...`, provisioningUrl);
const response = await fetch(provisioningUrl, {
  method: "POST",
  headers: {
    Authorization: `Basic ${Buffer.from(process.env.JAHIA_USER || "root:root1234").toString("base64")}`,
  },
  body,
});

if (!response.ok) {
  console.error(styleText("red", "%d: %s"), response.status, response.statusText);
  console.error(styleText("red", await response.text()));
  process.exit(1);
}

/** Removes useless intermediate objects (e.g. arrays with a single element) */
const trimObject = (/** @type {unknown} */ obj) => {
  // Remove empty arrays and arrays with a single element
  if (Array.isArray(obj)) {
    if (obj.length === 0) return undefined;
    if (obj.length === 1) return trimObject(obj[0]);
    return obj.map(trimObject);
  }

  // Remove useless properties from objects
  if (typeof obj === "object" && obj !== null) {
    return Object.fromEntries(
      Object.entries(obj)
        .map(([key, value]) => [key, trimObject(value)])
        .filter(([, value]) => value !== undefined && value !== null),
    );
  }

  // Keep all other types as they are
  return obj;
};

const data = await response.json();
console.log(inspect(trimObject(data), { depth: Infinity, colors: true }));
