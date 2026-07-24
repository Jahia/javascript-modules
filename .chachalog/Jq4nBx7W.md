---
# Allowed version bumps: patch, minor, major
javascript-modules: patch
---

Scaffolded modules now lint the server-runtime boundary: using a timer, `fetch`, a browser global or a Node.js built-in inside a `*.server.*` or `*.action.*` file is reported in the editor and by `yarn lint`, with a link to the new [server runtime boundary](https://github.com/Jahia/javascript-modules/blob/main/docs/3-reference/3-server-runtime-boundary/README.md) reference, instead of failing at runtime on the first call. Client files are unaffected. (#703)
