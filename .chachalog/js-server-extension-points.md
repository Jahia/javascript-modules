---
# Allowed version bumps: patch, minor, major
javascript-modules: minor
---

JavaScript modules can now declare choicelist initializers, server-side node validators and actions — extension points that previously required a Java module. Use the new `registerChoiceListInitializer`, `registerNodeValidator`, `registerAction` and `registerRenderFilter` functions from `@jahia/javascript-modules-library`.

Note for existing modules using `server.registry.add("render-filter", …)`: a declared `priority` is now honored (it was previously ignored and forced to 0), which may reorder such filters in the render chain.
