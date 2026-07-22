import { registerMigration } from "@jahia/javascript-modules-library";

/**
 * Test fixtures for JS migrations, exercised by tests/cypress/e2e/engine/migrationTest.cy.ts.
 *
 * The migrations run once when this module first starts on a fresh instance. 01 creates the fixture
 * content under /sites/systemsite/contents/migration-tests, 02-06 exercise the five guard-railed
 * operations on it, 07-09 exercise the skip / failure / halt semantics (names order execution, so
 * 09 must never run because 08 fails).
 */

const FIXTURES_PARENT = "/sites/systemsite/contents";
const FIXTURES_PATH = `${FIXTURES_PARENT}/migration-tests`;

registerMigration(
  {
    name: "1.0.0-01-create-fixture-content",
    description: "Creates the content the following migrations transform (imperative escape hatch)",
  },
  ({ jcr }) => {
    jcr.withSystemSession({ workspace: "default" }, (session) => {
      const parent = session.getNode(FIXTURES_PARENT);
      const folder = parent.hasNode("migration-tests")
        ? parent.getNode("migration-tests")
        : parent.addNode("migration-tests", "jnt:contentList");

      const content = folder.addNode("content1", "javascriptExample:migrationContent");
      content.setProperty("legacyColor", "red");
      content.setProperty("counter", "42");

      const legacy = folder.addNode("legacy1", "javascriptExample:legacyMigrated");
      legacy.setProperty("oldTitle", "hello");

      const doomed = folder.addNode("doomed1", "javascriptExample:doomedMigrated");
      doomed.setProperty("label", "to be deleted");

      session.save();
    });
  },
);

registerMigration(
  {
    name: "1.0.0-02-remove-legacy-color",
    description: "U1: removes leftover legacyColor values",
  },
  ({ migrate }) => {
    migrate.removePropertyValues({
      nodeType: "javascriptExample:migrationContent",
      property: "legacyColor",
    });
  },
);

registerMigration(
  {
    name: "1.0.0-03-backfill-theme",
    description: "U2: backfills the theme property on existing content",
  },
  ({ migrate }) => {
    migrate.setPropertyValues({
      nodeType: "javascriptExample:migrationContent",
      property: "theme",
      value: "light",
    });
  },
);

registerMigration(
  {
    name: "1.0.0-04-convert-counter",
    description: "U3: converts counter values from string to number",
  },
  ({ migrate, log }) => {
    migrate.convertPropertyValues({
      nodeType: "javascriptExample:migrationContent",
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

registerMigration(
  {
    name: "1.0.0-05-rename-legacy-type",
    description: "U5: rebinds legacyMigrated instances to newMigrated, renaming oldTitle to newTitle",
  },
  ({ migrate }) => {
    migrate.changeNodeType({
      from: "javascriptExample:legacyMigrated",
      to: "javascriptExample:newMigrated",
      mapProperties: { oldTitle: "newTitle" },
      // the legacy type is still in this module's CND (single-version test fixture), so keep its
      // definition registered instead of fighting the redeploy
      removeOldDefinition: false,
    });
  },
);

registerMigration(
  {
    name: "1.0.0-06-remove-doomed-type",
    description: "U4: purges doomedMigrated instances and unregisters the type",
  },
  ({ migrate }) => {
    migrate.removeNodeType({
      nodeType: "javascriptExample:doomedMigrated",
      ifContentExists: "delete",
    });
  },
);

registerMigration(
  {
    name: "1.0.0-07-skip-me",
    description: "Records .skipped without halting the following migrations",
  },
  ({ skip }) => {
    skip("nothing to do on this instance");
  },
);

registerMigration(
  {
    name: "1.0.0-08-fail-on-purpose",
    description: "Records .failed and halts the module's remaining migrations",
  },
  () => {
    throw new Error("intentional failure (migration e2e fixture)");
  },
);

registerMigration(
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
