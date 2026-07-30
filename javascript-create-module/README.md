# @jahia/create-module

This CLI scaffolds a new Jahia JavaScript module.

## Usage

To create a new module, run:

```
npm init @jahia/module@latest <module-name>
```

It creates a new JavaScript Module in a directory named `module-name` in the current working directory.

Three different project types are available:

- `hello-world`: A minimal Hello World template set. (Recommended for discovery)
- `template-set`: An empty template set. (If you want to start from scratch)
- `module`: An empty module.

### Unattended usage

Every question can be answered on the command line: pass `-y/--yes` to skip the prompts entirely.

```
npm init @jahia/module@latest my-module -- --yes --template template-set --output /tmp/module
```

| Option             | Description                                                                     |
| ------------------ | ------------------------------------------------------------------------------- |
| `[name]`           | Module name, lowercase letters, digits and hyphens only (required with `--yes`) |
| `-o`, `--output`   | Directory to create, must not exist yet (default to `./<name>`)                 |
| `-t`, `--template` | `hello-world`, `template-set` or `module` (default to `hello-world`)            |

Without `--yes`, the values you pass pre-fill the prompts instead of skipping them.

See the [Getting Started guide](https://academy.jahia.com/tutorials-get-started/front-end-developer/setting-up-your-dev-environment#create-a-new-project) for more information.
