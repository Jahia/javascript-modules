---
# Allowed version bumps: patch, minor, major
javascript-modules: minor
---

`buildNodeUrl` now autocollects cache dependencies for the content it links to, preventing 404 errors when the linked content is renamed or moved. (#783)

This mechanism is enabled by default but can be disabled on a per-view basis by setting `"cache.autocollectDependencies": "false"` in the view's properties, or on a per-call basis with the new `autocollectDependency: false` option in `buildNodeUrl`.
