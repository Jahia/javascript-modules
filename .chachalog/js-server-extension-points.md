---
# Allowed version bumps: patch, minor, major
javascript-modules: minor
---

JavaScript modules can now declare choicelist initializers, server-side node validators and actions — extension points that previously required a Java module. Use the new `registerChoiceListInitializer`, `registerNodeValidator`, `registerNodeLegacyAction` and `registerRenderFilter` functions from `@jahia/javascript-modules-library`.

Node validators and render filters take synchronous callbacks: Jahia can invoke them while JavaScript is already running, where the server runtime cannot settle a promise. An `async` callback is rejected when the module registers it. Choicelist initializers and legacy node actions are unaffected and may still be `async`.

Note for existing modules using `server.registry.add("render-filter", …)`: a declared `priority` is now honored (it was previously ignored and forced to 0), which may reorder such filters in the render chain.
