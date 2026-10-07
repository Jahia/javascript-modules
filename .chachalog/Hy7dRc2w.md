---
# Allowed version bumps: patch, minor, major
javascript-modules: patch
---

Fixed client-only islands being hydrated instead of rendered in the browser, which logged a hydration error in the console for each island. (#807)
