import { registerContentPatch } from "@jahia/javascript-modules-library";

/**
 * Test fixtures for JS content patches, exercised by
 * tests/cypress/e2e/engine/contentPatchTest.cy.ts.
 *
 * The content patches run once when this module first starts on a fresh instance. 01 creates the
 * fixture content under /sites/systemsite/contents/content-patch-tests, 02-06 exercise the five
 * guard-railed operations on it, 07-09 exercise the skip / failure / halt semantics (names order
 * execution, so 09 must never run because 08 fails).
 */

const FIXTURES_PARENT = "/sites/systemsite/contents";
const FIXTURES_PATH = `${FIXTURES_PARENT}/content-patch-tests`;

registerContentPatch(
  {
    name: "1.0.0-01-create-fixture-content",
    description:
      "Creates the content the following content patches transform (imperative escape hatch)",
  },
  ({ jcr }) => {
    jcr.withSystemSession({ workspace: "default" }, (session) => {
      const parent = session.getNode(FIXTURES_PARENT);
      const folder = parent.hasNode("content-patch-tests")
        ? parent.getNode("content-patch-tests")
        : parent.addNode("content-patch-tests", "jnt:contentList");

      const content = folder.addNode("content1", "javascriptExample:patchTestContent");
      content.setProperty("legacyColor", "red");
      content.setProperty("counter", "42");

      const legacy = folder.addNode("legacy1", "javascriptExample:patchTestLegacy");
      legacy.setProperty("oldTitle", "hello");

      const doomed = folder.addNode("doomed1", "javascriptExample:patchTestDoomed");
      doomed.setProperty("label", "to be deleted");

      session.save();
    });
  },
);

registerContentPatch(
  {
    name: "1.0.0-02-remove-legacy-color",
    description: "U1: removes leftover legacyColor values",
  },
  ({ patch }) => {
    patch.removePropertyValues({
      nodeType: "javascriptExample:patchTestContent",
      property: "legacyColor",
    });
  },
);

registerContentPatch(
  {
    name: "1.0.0-03-backfill-theme",
    description: "U2: backfills the theme property on existing content",
  },
  ({ patch }) => {
    patch.setPropertyValues({
      nodeType: "javascriptExample:patchTestContent",
      property: "theme",
      value: "light",
    });
  },
);

registerContentPatch(
  {
    name: "1.0.0-04-convert-counter",
    description: "U3: converts counter values from string to number",
  },
  ({ patch, log }) => {
    patch.convertPropertyValues({
      nodeType: "javascriptExample:patchTestContent",
      property: "counter",
      convert: (value, node) => {
        const parsed = Number.parseInt(value.getString(), 10);
        if (Number.isNaN(parsed)) {
          log.warn(`Unparseable counter on ${node.getPath()}, leaving it untouched`);
          return undefined;
        }
        return parsed;
      },
    });
  },
);

registerContentPatch(
  {
    name: "1.0.0-05-rename-legacy-type",
    description:
      "U5: rebinds patchTestLegacy instances to patchTestNew, renaming oldTitle to newTitle",
  },
  ({ patch }) => {
    patch.changeNodeType({
      from: "javascriptExample:patchTestLegacy",
      to: "javascriptExample:patchTestNew",
      mapProperties: { oldTitle: "newTitle" },
      // the legacy type is still in this module's CND (single-version test fixture), so keep its
      // definition registered instead of fighting the redeploy
      removeOldDefinition: false,
    });
  },
);

registerContentPatch(
  {
    name: "1.0.0-06-remove-doomed-type",
    description: "U4: purges patchTestDoomed instances and unregisters the type",
  },
  ({ patch }) => {
    patch.removeNodeType({
      nodeType: "javascriptExample:patchTestDoomed",
      ifContentExists: "delete",
    });
  },
);

registerContentPatch(
  {
    name: "1.0.0-07-skip-me",
    description: "Records .skipped without halting the following content patches",
  },
  ({ skip }) => {
    skip("nothing to do on this instance");
  },
);

registerContentPatch(
  {
    name: "1.0.0-08-fail-on-purpose",
    description: "Records .failed and halts the module's remaining content patches",
  },
  () => {
    throw new Error("intentional failure (content patch e2e fixture)");
  },
);

registerContentPatch(
  {
    name: "1.0.0-09-after-failure-never-runs",
    description: "Must never run: 08 fails before it",
  },
  ({ jcr }) => {
    jcr.withSystemSession({ workspace: "default" }, (session) => {
      session.getNode(`${FIXTURES_PATH}/content1`).setProperty("theme", "NEVER");
      session.save();
    });
  },
);
