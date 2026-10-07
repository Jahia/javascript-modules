---
# Allowed version bumps: patch, minor, major
javascript-modules: patch
---

`npm init @jahia/module` can now scaffold a project without a single prompt, which makes it usable from scripts, CI pipelines and coding agents: (#715)

```bash
npm init @jahia/module@latest my-module -- --template hello-world --yes
```
