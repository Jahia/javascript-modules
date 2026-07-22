---
page:
  $path: /sites/academy/home/documentation/jahia/8_2/developer/javascript-module-development/migrations
  jcr:title: Writing Migrations
  j:templateName: documentation
content:
  $subpath: document-area/content
---

Migrations are run-once TypeScript scripts shipped with your module, executed when a new version of the module starts. They reconcile existing content with changes in your content type definitions — the JavaScript equivalent of Jahia's Groovy `META-INF/patches` scripts, with a typed API and built-in guard rails.

Typical uses: removing leftover values of a dropped property, backfilling a default on existing content, converting values after a property type change, deleting a retired node type, or renaming a node type and rebinding its content.

## Declaring a migration

Call `registerMigration` at the top level of a server file (it registers the migration as a side effect at module startup, like `registerAction`). Convention: one migration per file under `src/migrations/`:

```ts
// src/migrations/2.0.0-01-remove-legacy-color.server.ts
import { registerMigration } from "@jahia/javascript-modules-library";

registerMigration(
  {
    name: "2.0.0-01-remove-legacy-color",
    description: "color was dropped from mymodule:banner in 2.0.0 — clean leftover values",
  },
  ({ migrate }) => {
    migrate.removePropertyValues({ nodeType: "mymodule:banner", property: "color" });
  },
);
```

The `name` is the migration's **run-once identity and ordering key**:

- A module's migrations run in lexicographic order of their names. Use the `"<moduleVersion>-<NN>-<slug>"` convention to keep them sorted.
- Execution is recorded under the name in Jahia's module patch status store (`/module-management` → `j:bundlesScripts`, shared with Groovy patches). Whatever the outcome, a recorded migration **never runs again** — never rename or reorder a released migration; ship a new one instead.

Migrations run **synchronously** on the module start thread (like actions, they must not be `async`), on the **processing server only**, and by the time they run the module's new definitions are already registered.

## The `migrate.*` helpers

Every helper iterates both the `default` and `live` workspaces (override with `workspaces`), commits in batches (`batchSize`, default 100), handles internationalized properties on their translation subnodes, logs progress, and no-ops gracefully when the node type was never registered on this instance (fresh installs).

```ts
// U1 — remove a property + clean its values
migrate.removePropertyValues({ nodeType: "mymodule:banner", property: "color" });

// U2 — add a property + backfill existing content
migrate.setPropertyValues({
  nodeType: "mymodule:banner",
  property: "theme",
  onlyIfMissing: true, // default — never clobbers an existing value
  value: (node) => (node.getProperty("price").getDouble() > 1000 ? "premium" : "light"),
});

// U3 — change a property's data type + convert values
migrate.convertPropertyValues({
  nodeType: "mymodule:banner",
  property: "priority",
  convert: (value) => Number.parseInt(value.getString(), 10), // undefined = leave untouched
});

// U4 — delete a definition (owned by this module)
migrate.removeNodeType({
  nodeType: "mymodule:legacyBanner",
  ifContentExists: "delete", // default is "fail" — destroying content is opt-in
});

// U5 — rename a definition + rebind existing items
migrate.changeNodeType({
  from: "mymodule:oldBanner",
  to: "mymodule:banner", // must exist in the module's current definitions
  mapProperties: { legacyTitle: "title" },
});
```

Selection options on the bulk helpers: `scope` (limit to a subtree), `where` (a JCR-SQL2 constraint fragment), `includeSubtypes` (default `true`). Definition operations (`removeNodeType`, `changeNodeType`) only accept node types **owned by your module** — cross-module definition surgery is not supported.

## The imperative escape hatch

For everything else (ACL fixes, node moves, one-off repairs), open a system session or use the batching engine directly:

```ts
registerMigration({ name: "2.0.0-02-fix-root-title" }, ({ jcr, log, skip }) => {
  jcr.withSystemSession({ workspace: "default" }, (session) => {
    const path = "/sites/mysite/contents/catalog-root";
    if (!session.nodeExists(path)) skip("nothing to fix on this instance");
    session.getNode(path).getRealNode().setProperty("jcr:title", null);
    session.save();
    log.info(`Cleaned stray jcr:title on ${path}`);
  });

  jcr.forEachNode(
    { query: "SELECT * FROM [mymodule:banner]", workspaces: ["default", "live"] },
    (node) => node.setProperty("migrated", true),
  );
});
```

With `locale: null` (the default), system sessions see translation subnodes as plain nodes — usually what migrations want.

## Outcomes and failure semantics

- Returning normally records `.installed`.
- Calling `context.skip(reason)` records `.skipped`.
- Throwing records `.failed`, and the module's **remaining migrations are held back** — persistently, across restarts and redeploys — until the failed record is cleared and the migration succeeds. The module itself still starts — migration failures never break startup.

All three outcomes are terminal. Batches already committed before a failure stay committed (JCR has no cross-save transactions), so write migrations to be **idempotent** — the built-in helpers are idempotent by construction.

## Development and testing

- `migrations.autoRun` (configuration PID `org.jahia.modules.javascript.modules.engine.migrations`, default `true`): set to `false` on development servers to log pending migrations at module start instead of running them.
- The reliable test is an end-to-end one against a real Jahia: provision the previous module version, create content, deploy the new version, and assert the transformed content — see `tests/cypress/e2e/engine/migrationTest.cy.ts` in the javascript-modules repository for a complete example (statuses, all five operations, skip/failure semantics).
- To re-run a migration on a development instance, remove its entry from the `j:bundlesScripts` property of `/module-management` (e.g. in the JCR browser) and restart the module. Dedicated CLI/GraphQL tooling for status, dry runs, and resets is planned.
