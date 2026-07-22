# Client-callable actions: dual-compiled `.action.ts` files over a single dispatch endpoint

- Status: accepted
- Date: 2026-07-22

## Context and Problem Statement

[#588](https://github.com/Jahia/javascript-modules/issues/588) specifies actions as typed server functions callable from client islands — inspired by SvelteKit remote functions: a `.action.ts` file is compiled once for the server (real implementation) and once for the client (network stub), with devalue serialization and optional Standard Schema input validation. How do we implement the build-time split, the server endpoint, and the wire protocol on top of the existing engine?

## Decision Drivers

- Zero boilerplate for module authors: export a function, import it from the client, call it.
- Ride proven infrastructure: the engine's registry/`doWithContext` model, the Render servlet's auth valves, devalue (already used for island props).
- CSRF safety without per-module configuration.
- The server JS runtime has no event loop: asynchronicity is microtask-only.

## Decision Outcome

### Build (vite-plugin)

`.action.{ts,js}` files (default glob `**/*.action.{js,ts}`) are compiled twice:

- **Server bundle**: the file is included as-is and a `__registerActionsModule({ …exports }, "<moduleName>")` call is appended (underscore-marked internal: the engine resolves the library as one shared module at runtime, so a separate subpath entry point is not resolvable there). Each exported function is registered in the engine registry under type `action`, key `<moduleName>/<exportName>` (module name read from `package.json` at build time — the same value the stubs embed, so no runtime agreement on bundle symbolic names is needed). Duplicate keys fail at module startup via the registry's add semantics.
- **Client bundle**: the module is replaced wholesale by generated stubs — one `async` function per export that POSTs `devalue.stringify(args)` and parses the response. The server implementation never reaches the client bundle, and imports it made (including `@jahia/javascript-modules-library`) disappear with it.

Export discovery is a deliberate v1 simplification: only top-level `export const <name> = …` / `export function <name>` declarations, extracted lexically (works identically on TS and JS, no parser dependency, no plugin-phase sensitivity). Other export forms emit a build warning and are ignored.

### Endpoint and wire protocol

One engine-owned platform action, `jsAction` (`GenericActionEndpoint`), dispatches to all registered actions:

- URL: `<currentPageUrl>.jsAction.do?name=<moduleName>/<exportName>` — riding the Render servlet keeps Jahia's authentication valves (calls execute as the visitor, guest included) and requires no new servlet/HTTP-whiteboard surface.
- Request body: devalue-serialized arguments array. Response envelope: `{"data": "<devalue>"}` on success, `{"error": "...", "issues": [...]?}` on failure — always on HTTP 200, because the render servlet only writes JSON bodies for 2xx action results; the stub discriminates on the envelope.
- The JS adapter (library) owns all serialization: the Java endpoint pipes opaque strings and never converts structured polyglot values.

### CSRF

The engine ships a single reviewable CSRF-guard whitelist entry (`*.jsAction.do`) in its own configuration. Actual protection is the mandatory **`X-JS-Action` request header**: HTML forms cannot set custom headers, and cross-origin scripts cannot send one without a CORS preflight that Jahia does not grant. This does not contradict [ADR-0004](0004-csrf-whitelisting-for-js-actions.md): that decision rejected _silent per-module_ whitelist generation for developer-shaped `.do` endpoints; here the endpoint is engine-owned, single, and header-protected by construction.

### Asynchronicity

Handlers may be `async`. The endpoint settles returned promises through `JSPromise.settle`: GraalJS drains the microtask queue when the last JavaScript frame returns to the host, so any composition of `async`/`await`/`then` over synchronous work settles before the endpoint reads the outcome (validated by unit tests against real GraalJS). Promises depending on timers or async I/O — which do not exist in the server runtime — are detected as never-settling and fail the call with an explicit message.

### Safe actions

`action(schema, implementation)` accepts any [Standard Schema](https://standardschema.dev) v1 schema (interface vendored — no validation-library dependency) and validates the single client-supplied argument. Validation failures reject with `ActionValidationError`; the adapter ships the issues (pre-stringified JSON) through the error envelope, and the client stub re-attaches them to the thrown `Error`.

## Considered Alternatives

- **Dedicated OSGi HTTP-whiteboard servlet** — rejected for v1: leaves Jahia's authentication valve chain and the `/modules/*` URL space with unclear interactions; the Render servlet gives auth, sessions and URL resolution for free.
- **Per-action platform Actions** (one `org.jahia.bin.Action` per export) — rejected: floods the global action-name map, requires per-module CSRF whitelists (the exact DX problem ADR-0004 chose not to solve silently), and gains nothing over a single dispatcher.
- **JSON wire format** — rejected: loses `Date`/`Map`/`Set`/cycles; devalue is already in the stack for island props.
- **AST-based export discovery** — deferred: a real parser (oxc/es-module-lexer) can replace the lexical extraction later without changing any contract.

## Consequences

- Good: end-to-end typed calls with one import; guests can call actions (public-site islands), with the explicit documented duty to validate inputs and enforce permissions in the function.
- Good: no per-module CSRF or servlet configuration.
- Limitation (documented): `location.pathname`-based stub URLs assume the island is served from a page render URL; the `.html` template extension is stripped, other extensions are passed through.
- Limitation (documented): microtask-only asynchronicity; no `export { }` lists/`default` in action files (v1).
- Intended evolution ([#690](https://github.com/Jahia/javascript-modules/issues/690)): swap the transport to a dedicated servlet (module-scoped URLs, real HTTP status codes, no CSRF-guard entry). Both wire ends are platform-generated, so the swap is invisible to module authors.
