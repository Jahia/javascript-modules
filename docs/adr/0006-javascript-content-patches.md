# Run JavaScript content patches through a dedicated registrar backed by core's patch status store

- Status: accepted
- Date: 2026-07-21

## Context and Problem Statement

Java module developers evolve content type definitions with Groovy scripts in `META-INF/patches`, executed by the jahiamodule-extender on bundle events and tracked once-per-(module, path) in the JCR (`/module-management` → `j:bundlesScripts`). JavaScript module developers have no equivalent: no way to remove leftover property values, backfill new properties, convert value types, or rebind content when a node type is renamed — with autocomplete and guard rails instead of Groovy-against-raw-APIs.

Full analysis, verified core facts and the API-first contract live in the working documents `CONTENT-PATCHES-PLAN.md` and `CONTENT-PATCHES-DEMO.md` (repository root).

## Decision Drivers

- Run-once semantics must be cluster-safe and survive engine/context restarts; GraalVM contexts are pooled, so JS top-level code and `bundleInitializer` entries run per context creation and cannot provide them.
- Operations teams already audit Groovy patch execution in one JCR store — a second, JS-only bookkeeping location would fragment that.
- Content patches must see the module's **new** definitions (core registers CND at `RESOLVED`, before `STARTED`).
- Failures must never prevent a module from starting (Groovy parity).
- No Jahia core changes.

## Considered Options

1. **A dedicated `Registrar` (`ContentPatchRegistrar`) executing registry entries of type `content-patch` at `BundleEvent.STARTED`, recording results through `BundleInfoJcrHelper` into the same status store as Groovy patches.**
2. Contribute a JS `PatchExecutor` to core's `Patcher` so `.js` files in `META-INF/patches` behave exactly like Groovy patches.
3. An engine-private tracking store (custom JCR nodes) with its own lifecycle hooks.

## Decision Outcome

Chosen option: **1 — dedicated registrar + shared status store.**

- `registerContentPatch(declaration, run)` (library) stores a raw `execute` adapter under registry type `content-patch`; `ContentPatchRegistrar` — the once-per-start `Registrar` seam introduced for server extensions — sorts entries by name, filters against recorded statuses, and executes pending ones inside `doWithContext`, handing each a `ContentPatchSupport` Java object (logger, dry-run flag, module metadata, owned-definitions operations).
- Statuses (`.installed` / `.skipped` / `.failed`, all terminal) are recorded under pseudo-paths `/javascript/content-patches/<name>` via the public, OSGi-exported `BundleInfoJcrHelper.get/storeModuleScriptStatus` — one audit trail for Groovy and JS, identical semantics, zero core changes. The store is deliberately NOT written through `Patcher.executeScripts`, which would gate 4-segment-version-prefixed names against the _platform_ version.
- Processing-server-only; a recorded failure is a **persistent barrier** — content patches ordered after it stay held across restarts until the record is cleared — but the module always starts; an `autoRun=false` configuration (PID `…engine.contentpatches`) defers execution on dev/staging servers.
- Content patches are synchronous (like actions — no promises in the GraalVM execution model); the wrapper fails fast on returned thenables.

Option 2 was rejected because `Patcher`'s executor list is a hardcoded whole-list `setPatchers` (last-writer-wins, no unregistration), executors receive script content as a plain string (incompatible with bundled/imported TS), and `.resolved`-time execution would require evaluating JS from a not-yet-started bundle. Option 3 was rejected for fragmenting the ops audit trail that option 1 gets for free.

### Consequences

- Good: run-once, ordering, halt-on-failure and cluster safety come from ~200 lines of registrar code plus an existing core store; neither Contentful nor Sanity offer built-in run-once tracking — this is a differentiator.
- Good: the typed JCR mutation surface added for content patches (java-ts-bind `methodWhitelist`: `setProperty`, `save`, `remove`, `setPrimaryType`, …) also fixes untyped mutation for actions.
- Bad: no checksum on names — an edited-but-same-name content patch silently does not re-run (Groovy parity; tooling may surface hash mismatches later).
- Bad: content patches block the bundle-event thread (Groovy parity); built-in batching bounds the cost, a background-execution option remains future work.
- Follow-up (not in this ADR): CLI/GraphQL tooling (`status`, dry-run-by-default `run`, `reset`, scaffolding) specified in `CONTENT-PATCHES-PLAN.md` §6/§12.
