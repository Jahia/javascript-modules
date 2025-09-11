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
    try {
      assert.strictEqual(actualContent, expectedContent, `File content mismatch for ${entry.name}`);
    } catch (error) {
      console.log(btoa(actualContent));
      console.log(btoa(expectedContent));
      throw error;
    }
  }

  // Check if the assets are present
  const assets = [
    "vite-DrFLeNov.png",
    "fira-code-cyrillic-ext-wght-normal-DhYMMuQd.woff2",
    "fira-code-cyrillic-wght-normal-9QsI0tO3.woff2",
    "fira-code-greek-ext-wght-normal-wWus70Ix.woff2",
    "fira-code-greek-wght-normal-B2SviObF.woff2",
    "fira-code-latin-ext-wght-normal-Dvfvaomy.woff2",
    "fira-code-latin-wght-normal-mEl1RKBN.woff2",
    "fira-code-symbols2-wght-normal-CE6EOz_n.woff2",
  ];

  for (const asset of assets) {
    const assetPath = path.join("dist", "assets", asset);
    assert.ok(fs.existsSync(assetPath), `Asset ${asset} is missing`);
  }
});
