# Content patch scripts — developer experience demo

Companion to [CONTENT-PATCHES-PLAN.md](CONTENT-PATCHES-PLAN.md). Everything below is **pre-implementation**: this is the exact developer-facing contract the implementation must fulfill (API-first spec). Decisions locked 2026-07-21: Groovy-parity fresh-install & failure semantics, `default`+`live` by default, definition operations limited to the module's **own** definitions, implemented directly on `feature/js-server-extensions`.

## 0. Scenario

Module `acme-catalog` evolves from **1.0.0** to **2.0.0**. The CND diff drives all five use cases:

```cnd
// settings/definitions.cnd — v1.0.0
<acme = 'http://acme.org/catalog'>

[acme:product] > jnt:content, jmix:structuredContent
 - title (string) i18n mandatory
 - color (string)                          // U1: dropped in 2.0.0
 - priority (string)                       // U3: string → long in 2.0.0
 - price (double)

[acme:legacyBadge] > jnt:content, jmix:structuredContent   // U4: deleted in 2.0.0
 - label (string)

[acme:oldTeaser] > jnt:content, jmix:structuredContent     // U5: renamed in 2.0.0
 - teaserTitle (string) i18n
 - body (string, richtext) i18n
```

```cnd
// settings/definitions.cnd — v2.0.0
<acme = 'http://acme.org/catalog'>

[acme:product] > jnt:content, jmix:structuredContent
 - title (string) i18n mandatory
 - priority (long)                         // U3: was string
 - price (double)
 - theme (string) = 'light' autocreated    // U2: new — existing content needs backfill

[acme:teaser] > jnt:content, jmix:structuredContent        // U5: replaces acme:oldTeaser
 - title (string) i18n                     //     was teaserTitle
 - body (string, richtext) i18n
```

Module layout in 2.0.0 — one content patch per file, name = run-once identity:

```
acme-catalog/
├── package.json                  # "version": "2.0.0"
├── settings/definitions.cnd      # v2 CND above
└── src/
    ├── components/…
    └── content-patches/
        ├── 2.0.0-01-remove-legacy-color.server.ts
        ├── 2.0.0-02-backfill-theme.server.ts
        ├── 2.0.0-03-convert-priority.server.ts
        ├── 2.0.0-04-drop-legacy-badge.server.ts
        ├── 2.0.0-05-rename-old-teaser.server.ts
        └── 2.0.0-06-clean-catalog-root-title.server.ts
```

> Build note: files ride the existing server bundle (side-effect registration, like `registerAction`). Prerequisite: extend the vite-plugin default server glob from `**/*.server.{jsx,tsx}` to `**/*.server.{js,jsx,ts,tsx}` — today plain `.ts` server files require a manual `inputGlob` override (the jahia-test-module already hits this for its extension fixtures).

## 1. U1 — remove a property + clean its values

```ts
// src/content-patches/2.0.0-01-remove-legacy-color.server.ts
import { registerContentPatch } from "@jahia/javascript-modules-library";

registerContentPatch(
  {
    name: "2.0.0-01-remove-legacy-color",
    description: "color was dropped from acme:product in 2.0.0 — clean leftover values",
  },
  ({ patch }) => {
    patch.removePropertyValues({ nodeType: "acme:product", property: "color" });
  },
);
```

What the helper does for you: iterates `default` **and** `live`, batches (100 nodes per `save()`/`refresh(false)` cycle), handles i18n properties on their translation subnodes, no-ops gracefully if the type was never registered on this instance (fresh install), logs progress per batch, honors dry-run mode.

## 2. U2 — add a property + backfill existing content

```ts
// src/content-patches/2.0.0-02-backfill-theme.server.ts
import { registerContentPatch } from "@jahia/javascript-modules-library";

registerContentPatch(
  {
    name: "2.0.0-02-backfill-theme",
    description: "theme is autocreated for new products; backfill existing ones",
  },
  ({ patch }) => {
    patch.setPropertyValues({
      nodeType: "acme:product",
      property: "theme",
      onlyIfMissing: true, // default — never clobbers an existing value
      value: (node) =>
        node.hasProperty("price") && node.getProperty("price").getDouble() > 1000
          ? "premium"
          : "light",
    });
  },
);
```

`value` is either a constant or a per-node function; `node` is a fully typed `JCRNodeWrapper`, so `getProperty(…).getDouble()` autocompletes. Returning `undefined` skips the node (counted and logged).

## 3. U3 — change a property's data type + convert values

```ts
// src/content-patches/2.0.0-03-convert-priority.server.ts
import { registerContentPatch } from "@jahia/javascript-modules-library";

registerContentPatch(
  {
    name: "2.0.0-03-convert-priority",
    description: "priority changed string → long in 2.0.0; convert stored values",
  },
  ({ patch, log }) => {
    patch.convertPropertyValues({
      nodeType: "acme:product",
      property: "priority",
      convert: (value, node) => {
        const parsed = Number.parseInt(value.getString(), 10);
        if (Number.isNaN(parsed)) {
          log.warn(`Unparseable priority "${value.getString()}" on ${node.getPath()} — defaulting to 0`);
          return 0;
        }
        return parsed;
      },
    });
  },
);
```

`convert` receives the old value as a typed `JCRValueWrapper` (the property may still carry the *old* type) and must return the new value; the helper rewrites the property under the new definition. Returning `undefined` leaves that node untouched.

## 4. U4 — delete a definition programmatically

```ts
// src/content-patches/2.0.0-04-drop-legacy-badge.server.ts
import { registerContentPatch } from "@jahia/javascript-modules-library";

registerContentPatch(
  {
    name: "2.0.0-04-drop-legacy-badge",
    description: "acme:legacyBadge is retired; purge instances and undeploy the definition",
  },
  ({ patch }) => {
    patch.removeNodeType({
      nodeType: "acme:legacyBadge",
      ifContentExists: "delete", // default is "fail" — destroying content is opt-in
    });
  },
);
```

Guard rails: the type must belong to **this module** (own-definitions only — cross-module surgery like the visibility/jcontent scripts is out of scope); with the default `"fail"`, the content patch is marked `.failed` and content is left untouched if instances still exist.

## 5. U5 — rename a definition + rebind existing items

```ts
// src/content-patches/2.0.0-05-rename-old-teaser.server.ts
import { registerContentPatch } from "@jahia/javascript-modules-library";

registerContentPatch(
  {
    name: "2.0.0-05-rename-old-teaser",
    description: "acme:oldTeaser → acme:teaser; teaserTitle → title",
  },
  ({ patch }) => {
    patch.changeNodeType({
      from: "acme:oldTeaser",
      to: "acme:teaser", // must exist in the 2.0.0 CND (registered before content patches run)
      mapProperties: { teaserTitle: "title" }, // i18n values follow their translation nodes
      // removeOldDefinition: true (default) — undeploys acme:oldTeaser afterwards
    });
  },
);
```

Per node: `setPrimaryType(to)`, property renames (i18n-aware), then the old definition is undeployed once all instances are rebound in both workspaces.

## 6. Escape hatch — imperative content patch (templates-system-style repair)

```ts
// src/content-patches/2.0.0-06-clean-catalog-root-title.server.ts
import { registerContentPatch } from "@jahia/javascript-modules-library";

registerContentPatch(
  {
    name: "2.0.0-06-clean-catalog-root-title",
    description: "an old import set a stray non-i18n jcr:title on the catalog root",
  },
  ({ jcr, log, skip }) => {
    jcr.withSystemSession({ workspace: "default" }, (session) => {
      const path = "/sites/acme/contents/catalog-root";
      if (!session.nodeExists(path)) skip("catalog root not present on this instance");
      const node = session.getNode(path);
      node.getRealNode().setProperty("jcr:title", null); // bypass i18n resolution, remove raw value
      session.save();
      log.info(`Cleaned stray non-i18n jcr:title on ${path}`);
    });
  },
);
```

For bulk imperative work, `jcr.forEachNode({ query: "SELECT * FROM [acme:product]", workspaces: ["default", "live"] }, (node) => { … })` provides the same batching/save/progress engine the `patch.*` helpers use.

## 7. The API contract (what autocomplete shows)

Trimmed `.d.ts` — the implementation target. **Content patches are synchronous** (no promises), consistent with actions and the GraalJS execution model; a returned thenable fails fast with a clear error. All underlying JCR calls block anyway, so `async` would buy nothing.

```ts
/**
 * Registers a content patch: a run-once script executed on the processing server when a new
 * version of this module starts, tracked in Jahia's module patch status store.
 */
export function registerContentPatch(
  declaration: ContentPatchDeclaration,
  run: (context: ContentPatchContext) => void,
): void;

interface ContentPatchDeclaration {
  /**
   * Run-once identity AND ordering key (lexicographic within the module).
   * Convention: "<moduleVersion>-<NN>-<slug>", e.g. "2.0.0-01-remove-legacy-color".
   * NEVER rename or reorder after release — ship a new content patch instead.
   * Duplicate names in one module throw at registration time.
   */
  name: string;
  /** Shown in logs, CLI and GraphQL status. */
  description?: string;
}

interface ContentPatchContext {
  /** High-level, guard-railed operations. */
  migrate: ContentPatchOperations;
  /** Lower-level JCR access: system sessions + the shared batching iterator. */
  jcr: ContentPatchJcr;
  /** SLF4J-backed logger (org.jahia.modules.javascript.modules.engine.contentpatches.<module>). */
  log: Logger;
  /** True in dry-run mode (the DEFAULT for `jahia content-patches run`) — helpers report instead of saving. */
  dryRun: boolean;
  /** Abort now and record `.skipped` (terminal, Groovy parity). */
  skip(reason: string): never;
  module: { name: string; version: string };
}

/** Common selection options for bulk operations. */
interface NodeSelection {
  nodeType: string;
  /** @default true */
  includeSubtypes?: boolean;
  /** Limit to a subtree, e.g. "/sites/acme". @default whole workspace */
  scope?: string;
  /** Optional SQL-2 constraint appended to the generated query, e.g. "price > 1000". */
  where?: string;
  /** @default ["default", "live"] */
  workspaces?: ("default" | "live")[];
  /** Nodes per save/refresh cycle. @default 100 */
  batchSize?: number;
}

type PropertyValue = string | number | boolean | Date | JCRNodeWrapper;

interface ContentPatchOperations {
  /** U1 — remove leftover values of a property (i18n-aware: cleans translation nodes too). */
  removePropertyValues(options: NodeSelection & { property: string }): OpReport;

  /** U2 — set a value on existing content. */
  setPropertyValues(
    options: NodeSelection & {
      property: string;
      /** Constant, or per-node function. Return undefined to skip a node.
       *  For i18n properties the function is called once per existing translation (locale passed). */
      value: PropertyValue | ((node: JCRNodeWrapper, locale?: string) => PropertyValue | undefined);
      /** @default true — never overwrite an existing value unless set to false. */
      onlyIfMissing?: boolean;
    },
  ): OpReport;

  /** U3 — rewrite values after a property type change. Return undefined to leave a node untouched. */
  convertPropertyValues(
    options: NodeSelection & {
      property: string;
      convert: (value: JCRValueWrapper, node: JCRNodeWrapper) => PropertyValue | undefined;
    },
  ): OpReport;

  /** U4 — undeploy a node type OWNED BY THIS MODULE.
   *  @default ifContentExists: "fail" — refuses while instances remain; "delete" purges them first. */
  removeNodeType(options: { nodeType: string; ifContentExists?: "fail" | "delete" }): OpReport;

  /** U5 — rebind all instances of `from` to `to` (setPrimaryType + optional property renames),
   *  then undeploy `from` (own definition only). */
  changeNodeType(
    options: Omit<NodeSelection, "nodeType"> & {
      from: string;
      to: string;
      mapProperties?: Record<string, string>;
      /** @default true */
      removeOldDefinition?: boolean;
    },
  ): OpReport;
}

interface ContentPatchJcr {
  /** Typed system session (new engine helper alongside doExecuteAsGuest). @default workspace "default" */
  withSystemSession<T>(
    options: { workspace?: "default" | "live"; locale?: string | null },
    callback: (session: JCRSessionWrapper) => T,
  ): T;
  /** The batching engine behind migrate.*, for imperative bulk work. */
  forEachNode(
    options: NodeSelection | (Omit<NodeSelection, "nodeType" | "includeSubtypes"> & { query: string }),
    callback: (node: JCRNodeWrapper) => void,
  ): OpReport;
}

interface OpReport {
  matched: number;
  updated: number;
  skipped: number;
  byWorkspace: Record<string, { matched: number; updated: number; skipped: number }>;
}
```

(`JCRNodeWrapper` / `JCRSessionWrapper` / `JCRValueWrapper` are the existing generated types — gaining `setProperty`, `addNode`, `remove`, `save`, `move`, `setPrimaryType`, `getRealNode`, … via the methodWhitelist extension, plan §5.)

## 8. Dev loop (what "test easily" looks like day-to-day)

Dev/staging servers set `autoRun: false` in the engine config (new setting); production keeps the default `true` (content patches run automatically at module start, exactly like Groovy patches). The CLI is safe by default: **`run` is a dry-run unless you pass `--no-dry-run`** (Sanity-inspired), and applying asks for confirmation (`--yes` for CI).

```console
$ npx jahia content-patches create backfill-theme       # scaffolding: computes the next NN
Created src/content-patches/2.0.0-02-backfill-theme.server.ts

$ yarn watch                       # build + deploy 2.0.0 as usual
# engine log: [content-patches] acme-catalog 2.0.0: 6 pending content patches (autoRun disabled — use CLI)

$ npx jahia content-patches status
MODULE         NAME                                  STATUS
acme-catalog   2.0.0-01-remove-legacy-color          pending
acme-catalog   2.0.0-02-backfill-theme               pending
acme-catalog   2.0.0-03-convert-priority             pending
acme-catalog   2.0.0-04-drop-legacy-badge            pending
acme-catalog   2.0.0-05-rename-old-teaser            pending
acme-catalog   2.0.0-06-clean-catalog-root-title     pending

$ npx jahia content-patches run                          # dry-run by default — nothing is saved
2.0.0-01-remove-legacy-color        default: 128 matched, 96 would update · live: 117/88
2.0.0-02-backfill-theme             default: 128/128 · live: 117/117
2.0.0-03-convert-priority           default: 128/126 (2 skipped, see warnings) · live: 117/115
2.0.0-04-drop-legacy-badge          default: 12 instances would be deleted · live: 9
2.0.0-05-rename-old-teaser          default: 34 rebound · live: 31 · acme:oldTeaser would be undeployed
2.0.0-06-clean-catalog-root-title   1 node would be fixed
dry-run: 6 content patches, 0 errors — pass --no-dry-run to apply

$ npx jahia content-patches run --no-dry-run
Apply 6 content patches to acme-catalog on http://localhost:8080? [y/N] y
…
2.0.0-06-clean-catalog-root-title   .installed (0.1s)
6 installed, 0 failed, 0 skipped

$ npx jahia content-patches run --no-dry-run --yes       # rerun-safety: identity is the name
nothing pending

# iterate on one script against disposable content:
$ npx jahia content-patches reset --name 2.0.0-03-convert-priority
$ npx jahia content-patches run --name 2.0.0-03-convert-priority        # dry-run again
```

Failure in production (autoRun on): Groovy parity — the module still starts, the failing content patch is recorded `.failed`, remaining content patches for that module are held back and stay `pending`:

```
ERROR [content-patches] acme-catalog 2.0.0-03-convert-priority failed: <stack> — recorded .failed;
      holding 3 remaining content patches for acme-catalog
```

Recovery beats Groovy (no hand-editing `j:bundlesScripts`): ship the fixed script (same name), then `npx jahia content-patches reset --name … && npx jahia content-patches run` (or the GraphQL mutations, admin-gated).

## 9. Testing your content patches (Q5 — the two levels explained)

**Level 1 — two-version e2e against a real Jahia (the backbone, in plan phases 1-3).**
The only test that proves JCR reality: i18n translation nodes, definition registration timing, live-workspace behavior. The recipe (shipped as a copyable harness + docs, and used by our own Cypress specs):

1. `yarn pack` the module twice — v1.0.0 (old CND, no content patches) and v2.0.0.
2. Start Jahia (docker), provision v1, create fixture content (GraphQL).
3. Deploy v2, wait for content patch status via GraphQL.
4. Assert content transformed + statuses `.installed` + redeploy is a no-op.

Cost: minutes per run, needs docker. This is what "test easily" means for correctness — today's Groovy equivalent has *no* recipe at all.

**Level 2 — vitest recorder fake (optional extra, the open part of Q5).**
A pure-JS `ContentPatchContext` stand-in: `patch.*`/`jcr.*` record their calls instead of touching a repository; your `convert`/`value` callbacks run for real. Tests assert structure and callback logic in milliseconds, no docker:

```ts
const { context, calls } = createContentPatchTestContext();
runContentPatch("2.0.0-03-convert-priority", context);
expect(calls.convertPropertyValues[0].options.nodeType).toBe("acme:product");
expect(calls.convertPropertyValues[0].options.convert(fakeValue("42"), fakeNode())).toBe(42);
```

What it can NOT catch: anything about actual JCR behavior. It's a fast guard for CI on the module side, not a substitute for level 1. (A third option — an in-memory JCR emulation — is deliberately rejected: high build/maintenance cost, false confidence on i18n/publication semantics.)

**Decision (2026-07-21)**: level 1 only in v1 — module devs run Cypress + docker in CI (Jahia standard). The level-2 recorder is deferred to plan phase 4.
