---
# Allowed version bumps: patch, minor, major
javascript-modules: minor
---

Fixed cached pages that kept showing a renamed or moved image or link until something else was published.

A view that builds a URL to other content is now refreshed when that content changes, with no extra code. Set `cache.autocollectDependencies` to `false` on a view to keep the previous behavior.
