---
# Allowed version bumps: patch, minor, major
javascript-modules: minor
---

New: content patches — versioned, run-once content transformations declared in JavaScript with `registerContentPatch`, tracked by Jahia's patch status store so each runs exactly once per environment. Guard-railed operations (`patch.*`) with low-level `jcr.*` access as an escape hatch.
