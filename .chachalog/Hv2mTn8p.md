---
# Allowed version bumps: patch, minor, major
javascript-modules: patch
---

The generic action endpoint (`<page>.jsAction.do`) now answers its JSON envelope whatever the caller's `accept` header, instead of an empty `200` when `application/json` was not requested, and carries a meaningful status: `400` for input rejected by an action's schema, `404` for an unknown action, `500` when the function throws. Calls made through the generated client stubs are unaffected. (#707)
