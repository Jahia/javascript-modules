# The fast development loop

`yarn watch` rebuilds your module and reinstalls it on every save. The rebuild takes tens of
milliseconds; the reinstall takes seconds, because Jahia packs a tarball, turns it into an OSGi
bundle, writes it to the JCR, and restarts the module.

`yarn dev:fast` keeps the rebuild and replaces the reinstall. Jahia still renders every page, and
the module stays installed exactly as it is; only its code is swapped:

- the **server bundle** is pushed into the running engine, which replaces the JavaScript source it
  evaluates and re-registers the views, filters and initializers the module declares;
- the **client bundles, the stylesheet and the emitted assets** are served straight from your `dist`
  directory, so the browser reads the build that just ran instead of the installed one;
- open pages **reload themselves** once the swap lands.

## Turning it on

The endpoint that accepts the code is off by default, and it is refused outright unless Jahia runs
in development mode. Enable it on your local instance:

```properties
# <jahia.data>/karaf/etc/org.jahia.modules.javascript.modules.engine.dev.DevServlet.cfg
enabled = true
```

Then, from your module, with the module already deployed and started:

```bash
yarn dev:fast
```

It reads the same `.env` as `yarn deploy` (`JAHIA_HOST`, `JAHIA_USER`), and pushing code requires the
root user. Set `JAHIA_DEV_ORIGIN` when Jahia cannot reach your machine at `localhost` or at
`host.docker.internal` — a Jahia on another host, for instance.

## What it covers, and what it does not

The swap replaces the server bundle. Everything Jahia reads from the installed bundle keeps needing
`yarn package && yarn deploy`, and the loop tells you when you touch one of those files.

| You change                                                    | What happens                     |
| ------------------------------------------------------------- | -------------------------------- |
| `*.server.tsx`, `*.action.ts`, anything they import           | Pushed, page reloads             |
| `*.client.tsx`, CSS, images and fonts emitted into `dist`     | Served from `dist`, page reloads |
| `.cnd`, `import.xml`, `locales/`, `settings/`, `package.json` | Redeploy — the loop says so      |

A reload is a reload: component state is not preserved, and there is no hot module replacement in
this version.

## Why it is safe to leave the endpoint off, and unsafe to leave it on

The endpoint replaces the code of a running module and serves a directory of your machine over
Jahia. Development mode alone does not enable it, deliberately: Jahia's operating mode defaults to
development, including in the published Docker images, so a switch that development mode implied
would be on nearly everywhere. Pushing code requires the root user, but while a session is open the
files under your module's `dist` are readable by anyone who can reach that Jahia. Run it on your own
instance, not on a shared one.
