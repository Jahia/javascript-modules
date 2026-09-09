# Reserve "action" for client-callable server functions; rename the platform bridge to "legacy node actions"

- Status: accepted
- Date: 2026-07-22

## Context and Problem Statement

Two distinct features both naturally claim the name "action":

1. The bridge to Jahia's classic `org.jahia.bin.Action` platform extension point — HTTP endpoints bound to content nodes (`<nodeUrl>.<name>.do`), initially shipped as `registerAction()`.
2. The client-callable server functions of [#588](https://github.com/Jahia/javascript-modules/issues/588) — `.action.ts` files compiled into typed RPC stubs, the forward-looking developer experience.

Shipping both under one word would permanently confuse documentation, support and code search. The API is unreleased, so a rename is still free.

## Decision Outcome

- **The plain name goes to the modern feature**: `.action.ts` files, the `action()` safe wrapper, and the docs page titled "Actions" all belong to the #588 implementation. It is the API developers should reach for by default.
- **The platform bridge becomes `registerNodeLegacyAction`** (registry type `node-legacy-action`, Java class `NodeLegacyActionRegistrar`, guide "Legacy Node Actions"). The name states both what it binds to (a content node) and its lineage (the legacy `.do` mechanism kept for Java parity and existing integrations).

### Considered alternatives

- `registerAction` for the bridge (status quo) — rejected: collides with the #588 vocabulary.
- `registerJCRAction` — rejected: `org.jahia.bin.Action` is a render/HTTP-layer concept, not a repository one; "JCR" suggests observation/listener semantics it does not have.
- `registerNodeAction` (without "legacy") — rejected by the maintainer in favor of an explicit legacy marker, steering new code toward `.action.ts` actions unless node-bound `.do` semantics are specifically needed.

### Consequences

- Good: one obvious default ("use actions"), one clearly-marked escape hatch for `.do` parity.
- Neutral: the docs must keep a "when to use what" table (done in both guides) since the two features overlap on "call the server over HTTP".
- Done pre-release; no compatibility shim exists or is needed.
