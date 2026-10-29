---
# Allowed version bumps: patch, minor, major
javascript-modules: patch
---

When a view is missing from a JavaScript context (its module's init script failed while the context was created), rendering now fails with an explicit `RenderException` naming the view, instead of a `NullPointerException` without stack trace. (#814)
