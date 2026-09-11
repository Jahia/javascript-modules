---
# Allowed version bumps: patch, minor, major
javascript-modules: patch
---

`buildNodeUrl` now keeps links inside the edit frame: when the mode is not passed explicitly, the
URL follows the servlet that served the request (`/cms/editframe`) instead of always pointing at
`/cms/edit`. Jahia only rewrites `/cms/edit` links found in an `<a href>`, so URLs reaching the
browser another way — island props, form actions, client-side navigation — used to reload the whole
edit interface inside the frame. (#788)
