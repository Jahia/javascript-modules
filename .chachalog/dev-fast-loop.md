---
# Allowed version bumps: patch, minor, major
javascript-modules: minor
---

New: `yarn dev:fast`, a development loop that swaps a module's code into a running Jahia instead of reinstalling it. The server bundle is pushed into the engine, which replaces the source it evaluates and re-registers what the module declares; the client bundles, the stylesheet and the emitted assets are served from the module's `dist` directory; open pages reload once the swap lands. Node type definitions, imported content, locales, resource bundles and OSGi configurations still come from the installed bundle and still need a redeploy — the loop says so when one of them changes.

The endpoint that accepts the code is disabled by default and refuses to answer outside development mode: enable it with `enabled = true` in `org.jahia.modules.javascript.modules.engine.dev.DevServlet.cfg`. Pushing code requires the root user. (#699)
