---
# Allowed version bumps: patch, minor, major
javascript-modules: minor
---

New: actions — server functions callable from client components as plain async calls. Export a function from a `.action.ts` file, import it in an island, and call it: arguments and results are serialized automatically (devalue), with optional input validation via any Standard Schema compatible library (`action(schema, fn)`).

The previous `registerAction` API (Jahia's node-bound `.do` endpoints) is renamed `registerNodeLegacyAction`.
