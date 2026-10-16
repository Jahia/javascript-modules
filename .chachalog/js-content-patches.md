---
# Allowed version bumps: patch, minor, major
javascript-modules: minor
---

New: content patches — versioned, run-once content transformations declared in JavaScript with `registerContentPatch`, tracked by Jahia's patch status store so each runs exactly once per environment. Guard-railed operations (`patch.*`) with low-level `jcr.*` access as an escape hatch. The operations engine is implemented once in Java and exported by the engine bundle (`ContentPatchService`), so Groovy patch scripts and Java modules share the exact same batching, i18n handling, guard rails and dry-run.
