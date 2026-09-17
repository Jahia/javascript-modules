import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("@jahia/vite-plugin output snapshot", () => {
  for (const entry of fs.readdirSync("expected", { recursive: true, withFileTypes: true })) {
    const expected = path.join(entry.parentPath, entry.name);
    const actual = path.join("dist", path.relative("expected", expected));

    if (entry.isDirectory()) {
      fs.accessSync(actual);
      continue;
    }

    const expectedContent = fs.readFileSync(expected, "utf8");
    const actualContent = fs.readFileSync(actual, "utf8");
    assert.strictEqual(actualContent, expectedContent, `File content mismatch for ${entry.name}`);
  }

  // Check if the assets are present
  const assets = [
    "vite-DrFLeNov.png",
    "fira-code-cyrillic-ext-wght-normal-DhYMMuQd.woff2",
    "fira-code-cyrillic-wght-normal-Y3u8pIsh.woff2",
    "fira-code-greek-ext-wght-normal-wWus70Ix.woff2",
    "fira-code-greek-wght-normal-B2SviObF.woff2",
    "fira-code-latin-ext-wght-normal-Dvfvaomy.woff2",
    "fira-code-latin-wght-normal-CHoedHDv.woff2",
    "fira-code-symbols2-wght-normal-CE6EOz_n.woff2",
  ];

  for (const asset of assets) {
    const assetPath = path.join("dist", "assets", asset);
    assert.ok(fs.existsSync(assetPath), `Asset ${asset} is missing`);
  }
});

test("client components carry hydration metadata, whether exported by default or by name", () => {
  const server = fs.readFileSync(path.join("dist", "server", "index.js"), "utf8");

  /** Extracts the (__filename, __exportName) pairs injected by the insert-filename plugin. */
  const metadata = [
    ...server.matchAll(
      /__filename: \{\s*value: "([^"]+)",[\s\S]*?__exportName: \{\s*value: "([^"]+)"/g,
    ),
  ].map(([, filename, exportName]) => ({ filename, exportName }));

  assert.deepStrictEqual(metadata, [
    // `export default function Foo()` in foo.client.tsx
    { filename: "dist/client/foo.client.tsx", exportName: "default" },
    // `export function Named()` and `export const AlsoNamed` in named.client.tsx
    { filename: "dist/client/named.client.tsx", exportName: "Named" },
    { filename: "dist/client/named.client.tsx", exportName: "AlsoNamed" },
  ]);

  // The client bundle must expose the named exports the server points at
  const client = fs.readFileSync(path.join("dist", "client", "named.client.tsx.js"), "utf8");
  assert.match(client, /as Named\b/);
  assert.match(client, /as AlsoNamed\b/);
});
