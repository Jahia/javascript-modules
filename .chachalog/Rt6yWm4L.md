---
# Allowed version bumps: patch, minor, major
javascript-modules: minor
---

A view that throws now reports itself. In development mode the failing fragment is replaced by a visible error box holding the message and the stack trace, instead of an HTML comment that only the page source revealed. Stack traces — in the box and in the server log, in every mode — have their positions mapped back to the module's own sources through the source map shipped next to the server bundle, so frames read `src/components/Foo/default.server.tsx:12` rather than `dist/server/index.js:3937`. Production rendering is unchanged. (#700)
