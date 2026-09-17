---
# Allowed version bumps: patch, minor, major
javascript-modules: minor
---

New: actions — server functions callable from client components as plain async calls. Export a function from a `.action.ts` file, import it in an island, and call it: arguments and results are serialized automatically (devalue), with optional input validation via any Standard Schema compatible library (`action(schema, fn)`).

New: `registerNodeLegacyAction` registers Jahia's node-bound `.do` action endpoints from JavaScript.

The vite plugin's server bundle input now also includes action files (`actions.inputGlob` option, default `**/*.action.{js,ts}`); the same files are replaced by fetch stubs in the client bundle.
