# @jahia/create-module

This CLI scaffolds a new Jahia JavaScript module.

## Usage

To create a new module, run:

```
npm init @jahia/module@latest <module-name>
```

It creates a new JavaScript Module in a directory named `module-name` in the current working directory.

## Non-interactive usage

The CLI asks for anything it was not given. Pass every input as a flag to scaffold a module without
a single prompt, from a script, a CI pipeline or a coding agent:

```
npm init @jahia/module@latest my-module -- --template hello-world --yes
```

| Flag                      | Description                                                        |
| ------------------------- | ------------------------------------------------------------------ |
| `<name>`                  | Module name, lowercase letters, digits and hyphens only            |
| `-t, --template <preset>` | Module preset: `hello-world` (default), `template-set` or `module` |
| `-p, --path <dir>`        | Directory to create the module in, defaults to `./<name>`          |
| `-y, --yes`               | Use the defaults for everything not passed as a flag               |
| `-i, --interactive`       | Force the interactive wizard, even without a terminal              |
| `-h, --help`              | Print the usage                                                    |

Without a terminal, the CLI never waits for an answer: if an input is missing, it prints the usage
on stderr and exits with code 1.

See the [Getting Started guide](https://academy.jahia.com/tutorials-get-started/front-end-developer/setting-up-your-dev-environment#create-a-new-project) for more information.
