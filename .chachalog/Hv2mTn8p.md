---
# Allowed version bumps: patch, minor, major
javascript-modules: patch
---

The generic action endpoint (`<page>.jsAction.do`) answers its JSON envelope whatever the caller's `accept` header, with a status describing the outcome: `400` for caller mistakes (missing header or name, malformed body, input rejected by an action's schema), `404` for an unknown action, `500` when the function throws. Plain HTTP callers (curl, server-to-server) can rely on the status; the generated client stubs discriminate on the envelope. (#707)
