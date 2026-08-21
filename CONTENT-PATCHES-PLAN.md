# TypeScript content patch scripts for JavaScript modules — implementation plan

- Status: **accepted** 2026-07-21 (all §10 questions resolved)
- Date: 2026-07-21

> **Layering update (2026-08, per the review of [#697](https://github.com/Jahia/javascript-modules/pull/697) and the plan in [#725](https://github.com/Jahia/javascript-modules/issues/725)):** the guard-railed operations and the batching engine described in §4–§5 are implemented once in **Java**, in the engine-exported `…engine.contentpatches` package. The TypeScript `patch.*` / `jcr.forEachNode` surface below is unchanged but is now a thin typed façade over that engine, and Groovy patch scripts / Java modules reach the same engine through the `ContentPatchService` OSGi service — with operation-by-operation parity asserted by twin Cypress suites (`contentPatchTest.cy.ts` / `contentPatchGroovyParityTest.cy.ts`). The rest of this document remains the design record.

- Baseline: branch `feature/js-server-extensions` (implementation lands directly on it); core facts verified against `Jahia/jahia@main` (8.2.3.0 prep, sha `5e20152`)
- Developer-facing contract (API-first spec, all five use cases as real files): [CONTENT-PATCHES-DEMO.md](CONTENT-PATCHES-DEMO.md)

## 1. Goal

Give JavaScript module developers the equivalent of Groovy `META-INF/patches` scripts — versioned, run-once data/definition content patches shipped with the module — but written in TypeScript, with autocomplete, guard rails, and a testable dev loop.

Target use cases (all must be expressible):

| #   | Use case                                                      | Typical trigger           |
| --- | ------------------------------------------------------------- | ------------------------- |
| U1  | Remove a property + clean its values on all existing content  | property dropped from CND |
| U2  | Add a property + backfill a default value on existing content | new required property     |
| U3  | Change a property's data type + convert existing values       | e.g. string → long        |
| U4  | Delete a node type definition programmatically                | retired component         |
| U5  | Rename a node type + rebind existing content to the new one   | component renamed         |

Plus an imperative escape hatch for everything else (ACL fixes, node moves, cross-workspace repairs — the kinds of things the reference Groovy scripts do).

## 2. Verified ground truth

### 2.1 How Groovy module patches actually work (Jahia core)

Verified in `Jahia/jahia` sources; key files: `core/.../org/jahia/tools/patches/Patcher.java`, `bundles/jahiamodule-extender/.../Activator.java`, `core/.../modulemanager/persistence/jcr/BundleInfoJcrHelper.java`.

- **Discovery**: `Activator.handlePatches` runs on OSGi bundle events, **processing server only** (`Activator.java:434-436`). It scans `bundle.findEntries("META-INF/patches", "*.<event>.*", true)` where event ∈ `resolved | started | stopped` (`Activator.java:147-153, 1289`). `.resolved` runs before module content import; there is no `.uninstalled`/`.updated` for modules.
- **Run-once tracking**: scripts inside a jar can't be renamed, so status is stored in JCR at `/module-management` (`jnt:moduleManagement`), property `j:bundlesScripts` = JSON `{ "<symbolicName>": { "<entryPath>": "<result>" } }` (`BundleInfoJcrHelper.java:158-196`). Keyed by **symbolic name + entry path only** — no checksum, no module version. Result strings: `.installed`, `.failed`, `.skipped` (all terminal, never retried — retry requires hand-editing the JCR JSON), `keep` (re-run on every matching event).
- **Ordering**: plain string sort of the _filename_ (`Patcher.java:103`) — hence prefixes like `8.2.0-01-`.
- **Version-gating trap**: filenames starting with a **4-segment** version (`8.2.0.0-…`) are gated against the _platform_ version and auto-skipped on fresh installs (`Patcher.java:102, 236-239`). Module scripts use 3-segment prefixes precisely to avoid this.
- **Failure semantics**: exceptions are caught, logged, recorded as `.failed`; **the module starts anyway**; no retry, no rollback.
- **Fresh installs**: module patches have no baseline notion — they run at the module's first `started`/`resolved` too. Scripts self-guard (`nodeExists`, etc.).
- **Script contract**: Groovy gets exactly two bindings: `log` and `setResult` (`GroovyPatcher.java:74-88`). No session, no user injected.
- **Extensibility**: `Patcher`'s executor list is hardcoded; the only mutator is whole-list `setPatchers` (last-writer-wins, fragile). **But** `Patcher.executeScripts(Collection, phase, BiConsumer)` and `BundleInfoJcrHelper.get/storeModuleScriptStatus` are public and OSGi-exported — the status store is reusable without touching Patcher. (Caution: routing scripts through `Patcher.executeScripts` would inherit the 4-segment platform-version gating — we implement our own loop and reuse **only the status store**.)

### 2.2 What the reference Groovy scripts actually do

Capability inventory from the linked examples (visibility, templates-system, site-settings-seo, jcontent verified; forms-core is a private repo — inferred from its name only):

- System sessions per workspace/locale: `JCRTemplate.doExecuteWithSystemSession[AsUser](user, workspace, locale, cb)`, nested cross-workspace sessions.
- Batched SQL-2 iteration: `ScrollableQuery(1000, query)` + `session.save()` + `session.refresh(false)` per batch (site-settings-seo).
- i18n subtleties: `node.getRealNode()` to bypass i18n resolution and touch raw/translation storage (templates-system).
- Node ops: `move`, `markForDeletion`, `Workspace.clone` (live→default restore), `setProperty(name, null)` to remove.
- Definition registry surgery: `NodeTypeRegistry.getAllNodeTypes(source)`, `JCRStoreService.undeployDefinitions(source)` — and even reflection on `ExtendedNodeType.systemId` to re-home definitions (visibility/jcontent). We will _not_ reproduce the reflection hack; U4/U5 need sanctioned wrappers.
- Deferral pattern: site-settings-seo schedules the heavy work as a Quartz `BackgroundJob` to get off the bundle-event thread.

### 2.3 What the `feature/js-server-extensions` branch gives us

- **The lifecycle seam**: `Registrar.register(Bundle)` is invoked **exactly once per `BundleEvent.STARTED`** by `JavascriptModuleListener` (`javascript-modules-engine-java/.../JavascriptModuleListener.java:86-99`); registrars are discovered as OSGi services (`@Reference(MULTIPLE, DYNAMIC, GREEDY)`) with replay for already-started bundles. JS top-level code and `bundleInitializer` entries run on **every pooled GraalJS context creation** — _not_ usable for run-once semantics.
- **The registration pattern**: typed wrapper (`registerAction.ts` et al.) → `server.registry.add(type, key, {…adapter})` → per-type registrar reads entries via `graalVMEngine.doWithContext(cp -> cp.getRegistry().find({type, bundleKey}))` (`AbstractServiceRegistrar.java:90-109`). Bridges never cache JS handles.
- **Build**: all `*.server.{ts,tsx,js,jsx}` files are concatenated into a single side-effect init script `dist/server/index.js` (`vite-plugin/src/multi-entry.ts`), shipped via the `Jahia-javascript-InitScript` header. Content patches can ride this — **no new packaging mechanism needed**.
- **Definitions**: CNDs are merged at build time into `META-INF/definitions.cnd` (`jshandler/JavascriptProtocolConnection.java:164-187`); registration is done by core during module deployment, so by the time `STARTED` fires, the **new** version's definitions are registered.
- **The gap**: the typed JCR surface is **read-only**. The java-ts-bind `methodWhitelist` (`javascript-modules-engine-java/.java-ts-bind/package.json`) exposes no `setProperty/addNode/remove/save/move/addMixin/setPrimaryType`. Mutation _works_ at runtime (`HostAccess.ALL`, `GraalVMEngine.java:203`) but is untyped. Also the only session helper is `server.jcr.doExecuteAsGuest` (guest user, live workspace — `js/server/JcrHelper.java:33-46`); content patches need a typed **system-session** helper.

## 3. Design decision (headline)

**Engine-managed content patch runner, following the registrar pattern, reusing core's patch-status store.**

```
src/**/*.server.ts                        (build: concatenated into init script)
  registerContentPatch({name}, run)  ──►  server.registry.add("content-patch", name, {…})
                                              │
BundleEvent.STARTED (processing server only)  ▼
  ContentPatchRegistrar.register(bundle)  ──►  find pending = entries − recorded
                                            sort by name → execute in doWithContext
                                              │
                                              ▼
  BundleInfoJcrHelper.storeModuleScriptStatus(symbolicName,
      "/javascript/content-patches/<name>" → ".installed" | ".failed" | ".skipped")
```

Why this shape:

- **Once-per-start for free** — the registrar seam is the only true once-per-module-start hook, already battle-tested by the four extension registrars on this branch.
- **Zero core changes** — no `Patcher.setPatchers` fragility (last-writer-wins, no restore on stop), no `.js`-in-`META-INF/patches` ambiguity for Java modules.
- **Ops consistency** — status lands in the _same_ JCR store (`/module-management` → `j:bundlesScripts`) as Groovy module patches, under a distinguishable pseudo-path prefix (`/javascript/content-patches/…` vs `/META-INF/patches/…`). One place to audit; cluster-shared; identical terminal semantics.
- **Same semantics as Groovy where it matters** (once-ever per name, module starts on failure, processing-only), **better DX where Groovy hurts** (typed API, dry-run, CLI reset/force instead of hand-editing JCR JSON).

Rejected alternatives:

1. _Contribute a JS `PatchExecutor` to core `Patcher`_ — `setPatchers` is whole-list replacement with no unregistration story; executors receive script content as a string (breaks bundled/imported TS); `.resolved` timing would require evaluating JS from a not-yet-started bundle. Revisit only if Java modules must also ship JS patches.
2. _Separate build entry per content patch_ (e.g. `*.patch.ts` → own dist file + new bundle header) — more moving parts (vite-plugin, transformer, header parsing) for no v1 benefit. The registry already gives us enumeration + lazy execution. Can be added later if init-script size becomes a concern.
3. _Provisioning-based (`.yaml` + custom operation)_ — whiteboard-extensible but wrong UX: not module-versioned, not tracked per module, no TS.

## 4. Developer experience

### 4.1 Authoring

Any `*.server.ts` file (convention: `src/content-patches.server.ts` or `src/content-patches/<name>.server.ts`):

```ts
import { registerContentPatch } from "@jahia/javascript-modules-library";

registerContentPatch(
  {
    name: "2.0.0-01-remove-legacy-color", // unique, stable, sortable — this IS the identity
    description: "Drop mymod:banner `color` values (property removed from CND in 2.0.0)",
  },
  ({ patch, jcr, log, dryRun, skip }) => {
    // …
  },
);
```

Two-arg `(declaration, run)` shape matches `registerAction` & friends. **Content patches are synchronous** — no promises, consistent with actions ("must return their result") and the GraalJS execution model; a returned thenable fails fast with a clear error. All underlying JCR calls block anyway.

Rules (enforced/linted, see §4.4):

- `name` is the run-once key — **never rename or reorder a released content patch**; ship a new one instead (exactly like Groovy filename discipline).
- Recommended pattern: `<moduleVersion>-<NN>-<slug>` (3-segment version + 2-digit counter), matching the Groovy convention. Execution order = lexicographic sort of names within the module.
- Result contract: returns normally → `.installed`; throws → `.failed` (logged, module still starts, remaining content patches for the module are **not** run); `skip("reason")` → `.skipped` (terminal, like Groovy).

### 4.2 The five use cases as guard-railed one-liners (`patch.*`)

```ts
// U1 — remove property + clean values (handles i18n translation nodes, both workspaces, batching)
patch.removePropertyValues({ nodeType: "mymod:banner", property: "color" });

// U2 — backfill a default on existing content
patch.setPropertyValues({
  nodeType: "mymod:banner",
  property: "theme",
  onlyIfMissing: true,
  value: "light", // or (node) => computed per node
});

// U3 — change data type + convert values
patch.convertPropertyValues({
  nodeType: "mymod:banner",
  property: "priority",
  convert: (value) => Number.parseInt(value.getString(), 10), // JCRValueWrapper in, new value out
});

// U4 — delete a definition programmatically
patch.removeNodeType({
  nodeType: "mymod:legacyBanner",
  ifContentExists: "fail", // default; or "delete" to purge instances first
});

// U5 — rename a definition + rebind existing items
patch.changeNodeType({
  from: "mymod:oldBanner",
  to: "mymod:banner", // to-type must exist in the new CND
  mapProperties: { legacyTitle: "jcr:title" }, // optional per-property renames
  removeOldDefinition: true,
});
```

Shared guard rails baked into every `patch.*` helper:

- Iterates **`default` and `live`** by default (`workspaces` option to override) — Groovy scripts patch live directly, bypassing publication; we do the same and document it.
- **Batched**: SQL-2 iteration with keyset/scrollable pagination, `session.save()` + `session.refresh(false)` every `batchSize` (default 100), progress logged per batch. (This is exactly what site-settings-seo hand-rolled.)
- **i18n-aware**: internationalized properties (detected via `ExtendedPropertyDefinition.isInternationalized`) are handled on translation subnodes (`getRealNode()` semantics) across all locales.
- **Graceful no-ops**: querying a node type that was never registered on this instance (fresh install) skips with a log line instead of throwing `InvalidQueryException`; missing properties are skipped, not errors.
- **Idempotent by construction** — safe to re-run after a mid-way failure (batches already committed are no-ops on retry).
- `dryRun` — helpers count/log intended changes and discard instead of saving (see §6 tooling).

### 4.3 Imperative escape hatch

For everything else (the forms-core-style ACL fix, node moves, cross-workspace repairs):

```ts
registerContentPatch({ name: "2.1.0-01-fix-upload-permissions" }, ({ jcr, log }) => {
  jcr.withSystemSession({ workspace: "default", locale: null }, (session) => {
    const node = session.getNode("/sites/mysite/files/uploads");
    node.setProperty("j:inherit", false); // typed once whitelist is extended (§5)
    session.save();
  });

  jcr.forEachNode(
    { query: "SELECT * FROM [mymod:banner]", workspaces: ["default", "live"], batchSize: 100 },
    (node) => {
      node.getRealNode().setProperty("color", null);
    },
  ); // same batching/saving/progress engine the migrate.* helpers use
});
```

- `jcr.withSystemSession` → new typed Java helper (`JcrHelper.doExecuteAsSystem(workspace, locale, cb)`) next to the existing `doExecuteAsGuest`.
- `jcr.forEachNode` → the shared batching engine, exposed directly.
- Full raw access remains available via `server.osgi.getService(...)` (untyped, unchanged).

### 4.4 Guard rails summary

| Rail                            | Mechanism                                                                                                             |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Autocomplete on mutations       | extend java-ts-bind `methodWhitelist` (§5)                                                                            |
| Can't run twice / cluster-safe  | JCR status store, processing-server-only registrar                                                                    |
| Can't hammer the repo           | enforced batching + save/refresh cycles                                                                               |
| Can't silently skip i18n values | helpers enumerate translation nodes                                                                                   |
| Fresh-install safety            | type-existence checks → graceful skip                                                                                 |
| Naming discipline               | dev-time validation in `registerContentPatch` (shape + duplicate detection) + registrar warning on non-sortable names |
| Failure blast radius            | per-module halt on first failure; module still starts; status recorded; `.failed` visible via CLI/GraphQL             |
| Recoverability                  | `reset`/`force` via CLI/GraphQL (vs Groovy's hand-editing of `j:bundlesScripts`)                                      |

Deliberately **not** in v1: platform-version gating (the 4-segment trap doesn't apply to us), `keep`/run-always results (use dev-mode `force` instead), automatic rollback (JCR has no cross-save transactions — we document "content patches must be idempotent" instead), `.resolved`-equivalent pre-start phase (see Risks).

## 5. Typed mutation surface (prerequisite work)

The `methodWhitelist` in `javascript-modules-engine-java/.java-ts-bind/package.json` currently exposes only `get*/has*/is*`. Add (types-only change — runtime already permits via `HostAccess.ALL`):

- `JCRNodeWrapper`: `setProperty` (relevant overloads), `addNode`, `remove`, `addMixin`, `removeMixin`, `setPrimaryType`, `getRealNode`, `markForDeletion`, `rename`, `orderBefore`, `revokeAllRoles`/`grantRoles`/`denyRoles` (ACL cases)
- `JCRSessionWrapper`: `save`, `refresh`, `move`, `getWorkspace`, `logout` (already partial)
- `JCRPropertyWrapper`: `setValue`, `remove`
- `JCRWorkspaceWrapper`: `clone`, `move`

This also unblocks **actions** (already on this branch), which today must mutate untyped — worth extracting as its own PR/ADR. Security posture unchanged: typing ≠ capability (capability was already `HostAccess.ALL`).

Second small prerequisite: extend the vite-plugin **default server glob** from `**/*.server.{jsx,tsx}` to `**/*.server.{js,jsx,ts,tsx}` — plain-TS server files (content patches, but equally actions/choicelists) currently require a manual `inputGlob` override, which is why jahia-test-module overrides it to `react/server/**/*.{ts,tsx}`.

## 6. Tooling & dev loop

- **`autoRun` engine setting** (default `true`): production keeps Groovy parity — content patches run automatically at module start. Dev/staging set `false` → the registrar only logs what's pending and defers to CLI/GraphQL. This is what makes `--dry-run` genuinely usable _before_ first execution (with autoRun on, deploying is executing).
- **GraphQL admin extension** (engine-provided, admin-permission-gated):
  - `javascriptModules.contentPatches { module, name, status }` — read from the status store + registry (shows `pending` for registered-but-not-recorded).
  - mutations: `runPending(module, dryRun)`, `run(module, name, force, dryRun)`, `reset(module, name)`.
- **CLI** (alongside `jahia-deploy` in `vite-plugin/bin/`, same env/credentials): `npx jahia content-patches status | create <slug> | run [--name n] [--no-dry-run] [--force] [--yes] | reset --name n`. **`run` is a dry-run by default** (Sanity-inspired, §12); applying requires `--no-dry-run` and a confirmation prompt (`--yes` skips it for CI). `create` scaffolds `src/content-patches/<version>-<NN>-<slug>.server.ts` with the next `NN`.
- **Dev loop**: `yarn watch` redeploys the module; already-recorded content patches don't re-run (correct prod semantics). While iterating on a content patch: `npx jahia content-patches run --name <n> --force --dry-run` until happy, then `--force` for real, then `reset` + fresh content for a final clean run. Documented as the standard recipe.
- **Observability**: per-content-patch log lines (start / per-batch progress / result + duration) under a dedicated logger (`org.jahia.modules.javascript.modules.engine.contentpatches`).

## 7. Testing strategy

- **Unit (vitest, no Jahia)**: `convert`/`value` callbacks are pure and trivially testable. Stretch: `@jahia/javascript-modules-library/testing` fake that records `patch.*` calls for asserting content-patch _structure_.
- **Java unit tests**: `ContentPatchRegistrar` covered like `AbstractServiceRegistrarTest` (pending-set computation, ordering, halt-on-failure, status-store writes mocked).
- **E2E (existing Cypress infra in `tests/`)** — the real proof, and the template module developers copy:
  1. Build `jahia-test-module` twice (version override at pack time): v1 with old CND, v2 with new CND + content patches.
  2. Provision v1 → create fixture content via `cy.apollo` (jcr addNode mutations).
  3. Deploy v2 tgz via provisioning API → poll content patch status via GraphQL.
  4. Assert: values removed/backfilled/converted (U1-U3), old type gone / content rebound (U4-U5), status `.installed`, **rerun-safety** (redeploy v2 → nothing re-runs), and publication status of touched nodes stays sane (both-workspace writes — see §12 publish-state row).
  5. Negative specs: throwing content patch → status `.failed`, module still serves views, subsequent content patch not run; `reset` + `run` recovers; `--dry-run` leaves content untouched.
- **Docs**: a "write your first content patch" guide in `docs/2-guides/` with the U1-U5 recipes, plus the testing recipe (two-version deploy) module authors can replicate.

## 8. Delivery phases

| Phase                        | Content                                                                                                                                                                                                                                                                                                                                                                                | Est.      |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| **0 — Spikes**               | (a) confirm CND registration completes before `STARTED` on _upgrade_ for JS modules; (b) `setPrimaryType` at scale incl. i18n/version history; (c) write/read `j:bundlesScripts` via `BundleInfoJcrHelper` from the engine bundle; (d) whitelist extension → java-ts-bind regen sanity                                                                                                 | 2-3 d     |
| **1 — Runtime MVP**          | `registerContentPatch` wrapper + types (sync contract); `content-patch` registry type; `ContentPatchRegistrar` (processing-only, sort, pending-set, execute in `doWithContext`, status store, halt-on-failure, `autoRun` setting); typed `withSystemSession` + `forEachNode`; whitelist extension; vite-plugin default-glob extension; test-module fixture + first e2e (U1 imperative) | 4-6 d     |
| **2 — Guard-railed helpers** | `patch.removePropertyValues / setPropertyValues / convertPropertyValues / changeNodeType / removeNodeType` with i18n + batching + graceful no-ops; `dryRun`; unit tests; e2e for U1-U5                                                                                                                                                                                                 | 4-6 d     |
| **3 — Tooling & docs**       | GraphQL admin extension; `jahia content-patches` CLI (dry-run-by-default `run`, `create` scaffolding, `status`, `reset`); create-module template snippet; docs guide + ADR 0006 (+0007 for whitelist)                                                                                                                                                                                  | 3-5 d     |
| **4 — Optional/later**       | background execution (Quartz deferral à la site-settings-seo); rich report node (timestamps, durations, log tail); vitest recorder fake (Q5); `patch.extractToReference` + `content-patches validate` sweep + publish-state options (§12); pre-start phase if a real U4-style cross-module case demands it; separate build entries if init-script size hurts                           | on demand |

Phases 1-3 ≈ **3 weeks** of focused work. Phase 1 alone is a usable (imperative-only) MVP.

## 9. Risks & mitigations

- **Definitions timing on upgrade** (spike 0a): if core registers the new CND _after_ `STARTED` in some path, U5's `to`-type could be missing → registrar re-checks type existence and defers with clear error. Spike decides.
- **Bundle-event thread blocking**: content patches run synchronously in the OSGi event dispatch (same as Groovy `.started`). Mitigation: enforced batching bounds memory, docs recommend background phase-4 option for very large repos; log duration.
- **No checksum on names** (Groovy parity): an edited-but-same-name content patch silently won't re-run. Mitigation: docs discipline + CLI `status` could later surface a hash mismatch (phase 4).
- **`removeNodeType` limits**: unregistering node types live has known constraints (registry + Jackrabbit nodetype store). Spike in phase 2; worst case U4 documents "requires content removal + falls back to `undeployDefinitions` semantics".
- **Status-store writes**: single JSON property on `/module-management`, also written by the extender. Writes are processing-server-only and per-bundle-event (effectively serialized); do read-modify-write per content patch, matching extender behavior.

## 10. Decisions (resolved 2026-07-21)

1. **Fresh-install baseline**: ✅ Groovy parity — content patches also run on a module's first install; helpers no-op gracefully (type-existence checks). Covers the "module reinstalled but content survived" edge.
2. **Failure policy**: ✅ Groovy parity — log, record `.failed`, module still starts, later content patches for that module held back. (`required: true` to block module start stays a phase-4 idea.)
3. **Workspace default**: ✅ `["default", "live"]` for all `patch.*` helpers and `jcr.forEachNode`, overridable per call.
4. **U4/U5 scope**: ✅ a module's **own definitions only** — content purge/rebind + `undeployDefinitions` for types this module registered; no cross-module re-homing (the visibility/jcontent `systemId` reflection pattern stays out of scope).
5. **Testing scope in v1**: ✅ two-version Cypress/docker e2e recipe only (module devs run docker in CI — Jahia standard); the vitest recorder fake moves to phase 4. Both levels explained in [CONTENT-PATCHES-DEMO.md](CONTENT-PATCHES-DEMO.md) §9.
6. **Branch strategy**: ✅ implement directly on `feature/js-server-extensions`.

## 11. Assumptions

- Jahia 8.2.x floor (core facts verified on 8.2.3 sources; status-store API `BundleInfoJcrHelper` is exported there).
- Content patches are for **JS modules only** — no ambition to run TS patches for Java modules (that would force the core-`Patcher` route rejected in §3).
- Content volumes up to ~10⁵-10⁶ nodes per type are in scope via batching; larger repos → phase-4 background mode.
- Publication semantics: patching `live` directly (like every reference Groovy script) is acceptable; no auto-publish step.
- The forms-core example (private repo) is ACL-shaped; covered by the escape hatch + ACL methods in the whitelist, not a dedicated `patch.*` helper.

## 12. Prior art: Contentful & Sanity (added 2026-07-21)

Sources: `contentful-migration` README + Contentful CLI `space migration` docs (contentful.com itself rate-limited fetches — plan-rendering details flagged accordingly); sanity.io "Schema and content migrations" + CLI migration reference.

**Philosophy check.** Two models exist. Contentful: the schema _lives in the CMS_ and migrations mutate it imperatively (`createContentType`, `editContentType`, `changeFieldId`, `moveField`, …) — the migration history _is_ the schema. Sanity: the schema _is code_ (`defineType`), deployed like any code change; migrations (`defineMigration` + `at()/set()/setIfMissing()/unset()` patches) only reconcile content. **Jahia JS modules are the Sanity model** — the CND is the declarative source of truth shipped with the module, and migrations reconcile content — which independently validates this plan's shape. With one notable difference in our favor: **neither product has built-in run-once tracking**. Contentful's documented pattern is a hand-rolled `versionTracking` content type driven by CI ordering; Sanity has no ledger at all (idempotency discipline + dry-run). Our JCR status store + module lifecycle gives run-once, ordering and halt-on-failure out of the box.

| Dimension                | Contentful                                                           | Sanity                                                                 | This plan                                                                         |
| ------------------------ | -------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Schema owner             | CMS, mutated by migrations                                           | Code (`defineType`)                                                    | Code (CND in module)                                                              |
| Declaration              | `module.exports = fn(migration, ctx)` (TS types available)           | `defineMigration({title, documentTypes, filter, migrate})`             | `registerContentPatch(declaration, run)`                                          |
| Run-once tracking        | none built-in (CI + `versionTracking` pattern)                       | none (idempotency discipline)                                          | **built-in** (JCR status store, keyed by name)                                    |
| Ordering                 | CI discipline                                                        | none                                                                   | lexicographic within module + halt-on-failure                                     |
| Selection                | per content type only                                                | `documentTypes` + GROQ `filter`                                        | `nodeType`/subtypes + `scope` + `where` SQL-2 fragment + full-query escape hatch  |
| Type rename / conversion | `transformEntriesToType`, `changeFieldId` (copy-based, ref rewiring) | **impossible** (`_type`/`_id` immutable → export/edit/reimport)        | `changeNodeType` — JCR `setPrimaryType` rebinds in place                          |
| Extract-to-reference     | `deriveLinkedEntries` (with `identityKey` dedup)                     | manual                                                                 | phase-4 candidate `patch.extractToReference`                                      |
| Dry-run                  | none — plan + confirmation prompt (`--yes` for CI)                   | **default**; `--no-dry-run` to apply; `--from-export` offline dry-runs | **adopted**: CLI dry-run by default (§6)                                          |
| Publish/draft state      | `shouldPublish: 'preserve'` on bulk transforms                       | n/a                                                                    | default+live writes; publication-status of touched nodes verified in phase-2 e2e  |
| Scaffolding              | none                                                                 | `sanity migration create` (templates)                                  | **adopted**: `jahia content-patches create <slug>`                                |
| Batching / limits        | `requestBatchSize` (100), `retryLimit` vs CMA rate limits            | transactions + `--concurrency 1-10`                                    | `batchSize` save/refresh cycles — server-side, no rate-limit machinery needed     |
| Rollback                 | none (environments + alias flip)                                     | none (backup first)                                                    | none (documented; helpers idempotent by construction)                             |
| Sandbox / testing        | sandbox environments cloned from master                              | dataset copy/export; offline `--from-export`                           | docker two-version e2e recipe; staging with `autoRun=false`                       |
| Validation               | pre-apply validation w/ line-accurate errors (chained API)           | `sanity documents validate` (per-doc markers + Studio deep links)      | registration-time name checks; phase-4 candidate `content-patches validate` sweep |

**Adopted into this plan** (edits applied to §6/§8 and the demo):

1. **CLI dry-run by default** (Sanity's standout guard rail): `jahia content-patches run` performs a dry-run; applying requires `--no-dry-run` plus a confirmation prompt (`--yes` for CI). Production `autoRun` at module start is unchanged (Groovy parity — a server upgrade can't pause for a prompt).
2. **Scaffolding** (Sanity): `jahia content-patches create <slug>` generates `src/content-patches/<version>-<NN>-<slug>.server.ts`, computing the next `NN` from existing files — encodes the naming discipline instead of documenting it.
3. **`where` filter** (analog of Sanity's GROQ `filter`): optional SQL-2 constraint fragment on `NodeSelection` (e.g. `where: "price > 1000"`), sitting between plain `nodeType` selection and the full-query escape hatch.

**Phase-4 candidates noted, not committed**: `patch.extractToReference` (Contentful `deriveLinkedEntries` analog — inline sub-content → referenced node with dedup), a `content-patches validate` content-vs-definitions sweep with per-node report (Sanity `documents validate` analog), publish-state preservation options (Contentful `shouldPublish: 'preserve'` analog).

**Deliberately ahead**: built-in run-once/ordering; in-place type rename (JCR `setPrimaryType` — Sanity can't at all, Contentful copies + rewires); execution server-side next to the repository (no rate limits, no client credentials). **Accepted gaps**: Contentful environments give a cheap sandbox-and-alias-flip "rollback" Jahia lacks (ours: staging servers + backups); Sanity's `--from-export` offline dry-run has no cheap equivalent (ours needs a running Jahia); Contentful's editor-UI-as-schema operations (field controls, layouts, sidebar widgets) are out of scope — Jahia covers that surface with content-editor forms definitions, not migrations.
