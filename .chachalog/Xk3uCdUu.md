---
# Allowed version bumps: patch, minor, major
javascript-modules: patch
---

`server.render.addCacheDependency({ uuid }, renderContext)` now correctly registers the dependency, instead of doing nothing. (#792)
