---
# Allowed version bumps: patch, minor, major
javascript-modules: patch
---

Fixed query string parameters being appended after the fragment in `buildNodeUrl`, `buildEndpointUrl` and `buildModuleFileUrl`. (#749)

Building a URL for `#main` with `{ a: "b" }` produced `#main?a=b`, where the query string is part of the fragment and never reaches the server. It now produces `?a=b#main`. Passing an empty set of parameters no longer appends a bare `?` either.
