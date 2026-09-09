# Actions framework improvements plan

Improvements to the `feature/js-server-extensions` branch (PR #687) driven by the first external
consumer of the actions framework and the `JSServerExtensionInvoker` SDK: **formidable** (PR
Jahia/formidable#164 + the `fmdb:callServerAction` bridge built on top of it). No code here yet —
this file is the agreed plan. Items 1–3 target the current branch or an immediate follow-up; item
4 is explicitly a separate, dedicated PR.

Context: formidable evaluated replacing its `formidable-form-action` registry type with the
generic actions framework and concluded (correctly) that the two solve different problems — form
actions need host-object context (action node, session, request, files) and HTTP-status failure
semantics that the devalue RPC transport doesn't carry. Formidable keeps its own registry type
consumed through the SDK, and instead **bridges** generic actions as one selectable form action
(`fmdb:callServerAction`). That bridge is what surfaces the gaps below.

## 1. Action metadata (`label`, `description`, `tags`)

**Problem.** Registry entries of type `action` carry only `key` (`<moduleName>/<exportName>`),
`type`, `bundleKey`, and the opaque `execute`. Any consumer that wants to *enumerate* actions —
formidable's "Call Server Action" picker, a future admin UI, docs tooling — has no human label and,
worse, no way to distinguish actions meant for such reuse from internal client RPCs. Formidable
defined the consuming convention already (entries tagged `form-action` are listed/invoked; see
`formidable-elements/src/server/actions/callServerAction.server.ts`), but nothing can produce the
tag yet.

**Design.**

- Metadata is attached to the exported function itself, so it survives the vite plugin's lexical
  export discovery without new syntax:
  - `action(schema, fn, meta?)` — third optional argument on the safe wrapper.
  - `withActionMeta(fn, meta)` — helper for raw (schema-less) exports.
  - Both store the object under a well-known symbol/property (e.g. `fn[ACTION_META]`).
- `registerActionsModule` reads the property and spreads it as **flat fields** on the registry
  entry: `label: string`, `description?: string`, `tags?: string[]`. Flat because `Registry.find`
  filters on top-level fields only, and because consumers read entries as plain maps through the
  SDK (`forEach`) where nested structures add noise. `execute` semantics are unchanged.
- Reserved/known tag values are documented, starting with `form-action` (formidable's contract:
  the action accepts a single `{formId, locale, parameters}` argument; return value ignored).
  Tags are otherwise free-form.
- Guard: metadata keys are whitelisted (`label`, `description`, `tags`) so authors can't shadow
  `execute`/`key`/`type`/`bundleKey`.

**Touch points.** `javascript-modules-library/src/framework/actions/action.ts`,
`registerActionsModule.ts`, types, the "Actions" guide, one Cypress assertion enumerating the
test-module action with metadata. No engine-java change.

## 2. SDK `Invoker.call` settles thenables

**Problem.** `JSServerExtensionInvoker.Invoker.call` converts the JS return value to plain Java
immediately, so a JS extension returning a promise is unusable through the SDK. The engine solved
this for its own endpoint with `JSPromise.settle` (microtask drain on host return), but SDK
consumers can't reach it. Formidable had to build a two-phase workaround (`execute` returns
`{pending: true}`; a second `collect` call, made after the first host return drained the microtask
queue, reads the captured outcome — see `JsFormActionDispatcher` + `registerFormAction`).

**Design.**

- In `JSServerExtensionInvokerImpl`, before `convert(...)`: if the result is thenable, settle it
  with `JSPromise.settle` (move/share the class — it currently lives in `actions/`); convert the
  fulfilled value, or throw a `RuntimeException` carrying the rejection reason. Never-settling
  promises (timer/I-O-dependent) fail with the same explicit message as the endpoint.
- Javadoc the contract on `Invoker.call`; add GraalJS-backed unit tests mirroring the existing
  `JSPromise` tests, but through the SDK surface.
- Backward compatible: sync results behave exactly as before.

**Follow-up in formidable once released:** delete the `pending`/`collect` protocol on both sides
(TS adapter + dispatcher) — the wrapper just returns the handler's promise.

## 3. Export the registrar SPI

**Problem.** `Registrar` is already a whiteboard (`JavascriptModuleListener` binds
`Registrar` services with dynamic/multiple cardinality), so third-party bundles *could* plug into
JS-module lifecycle — but the `...engine.registrars` package is not exported; only `...engine.sdk`
is. Consumers that want to publish JS registry entries as their own OSGi services (the
`AbstractServiceRegistrar` pattern used by choicelists/render-filters/legacy actions) must instead
re-resolve entries per call, and re-implement matching/fallback logic.

**Design.**

- Promote a consumer-facing SPI into the `sdk` package (keeping the internal registrars where they
  are): `JSExtensionRegistrar` (the `register(Bundle)`/`unregister(Bundle)` pair) and an exported
  abstract base equivalent to `AbstractServiceRegistrar` (service class + registry type +
  `createBridge`), documented with the same invariants (bridges re-resolve entries inside
  `doWithContext` per invocation; per-entry failure isolation).
- Internal registrars migrate to the exported base at leisure; no behavior change.

**Payoff for formidable:** `JsFormActionDispatcher`, the optional-reference plumbing in
`FormSubmitServlet`, and the Java-vs-JS precedence special-casing in `FormSubmissionPipeline`
collapse into one registrar that publishes each `formidable-form-action` entry as a regular
`FormAction` OSGi service.

## 4. Java-native `invokeAction` API — separate, dedicated PR (after 1–3)

**Problem.** Generic actions can only be invoked first-class over HTTP. Java code (or SDK
consumers like formidable's bridge, currently doing this from TS instead) must hand-build a
devalue-serialized args string and parse the devalue result — the wire format leaks into every
caller.

**Design sketch (to refine in its own PR).**

- New SDK method, e.g. `ActionInvoker.invoke(String name, Object... args)`:
  - resolves the `action` entry, serializes args and deserializes the result **by delegating to a
    JS-side adapter** (the library owns devalue, per ADR-0008's "the JS adapter owns all
    serialization" — Java must not re-implement devalue),
  - settles promises (depends on item 2),
  - maps `{message, issues?}` rejections to a typed `ActionInvocationException`.
- Open questions for that PR: which Java types are devalue-encodable (align with island props),
  whether host objects should be allowed as args (probably not — keeps the "actions are
  context-free" model honest), and whether invocation should honor `tags` (e.g. refuse untagged
  internal actions when called by third parties).

## Suggested sequencing

1. Item 1 (metadata) — small, unblocks formidable's picker end-to-end; can land in PR #687 or as
   the first follow-up.
2. Item 2 (promise settling) — engine-java only, well-testable; unblocks async simplification for
   every SDK consumer.
3. Item 3 (registrar SPI) — API-design-heavy; needs maintainer alignment on the exported surface.
4. Item 4 (invokeAction) — dedicated PR after the above, since it builds on items 1–2.
