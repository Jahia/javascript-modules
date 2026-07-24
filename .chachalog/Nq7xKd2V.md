---
# Allowed version bumps: patch, minor, major
javascript-modules: minor
---

`npm init @jahia/module` can now scaffold a project without a single prompt, which makes it usable from scripts, CI pipelines and coding agents (#701):

```bash
npm init @jahia/module@latest my-module -- --template hello-world --yes
```

Available flags: `--template <hello-world|template-set|module>`, `--path <dir>`, `--yes`, `--interactive` and `--help`. The wizard is unchanged when no flag is passed, and only asks for what the flags did not provide. Without a terminal, a missing input prints the usage and exits with code 1 instead of waiting forever.
