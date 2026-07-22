---
page:
  $path: /sites/academy/home/documentation/jahia/8_2/developer/javascript-module-development/legacy-node-actions
  jcr:title: Declaring Legacy Node Actions
  j:templateName: documentation
content:
  $subpath: document-area/content
---

Legacy node actions are HTTP endpoints bound to content nodes: appending `.<actionName>.do` to a node URL invokes the action against that node. They expose the classic Jahia `org.jahia.bin.Action` mechanism to JavaScript modules, for parity with Java modules — useful for plain HTML form submissions and for interoperating with existing `.do`-based integrations.

> To call server code from client components (islands), prefer [actions](../7-actions/README.md): typed, client-callable functions with automatic serialization.

## Declaring a legacy node action

Call `registerNodeLegacyAction` at the top level of a server file (it registers the action as a side effect at module startup, like `jahiaComponent`):

```ts
import { registerNodeLegacyAction } from "@jahia/javascript-modules-library";

registerNodeLegacyAction(
  { name: "myModuleGreet", requiredMethods: ["GET"], requireAuthenticatedUser: false },
  ({ parameters, resource }) => ({
    json: {
      greeting: `Hello ${parameters.who?.[0] ?? "world"}`,
      path: resource.getNode().getPath(),
    },
  }),
);
```

The action is then reachable on any node URL:

```
GET /cms/render/live/en/sites/mysite/home.myModuleGreet.do?who=Jahia
Accept: application/json
→ 200 {"greeting": "Hello Jahia", "path": "/sites/mysite/home"}
```

Note that Jahia's render servlet only writes the JSON body when the request declares it accepts JSON — send an `Accept: application/json` header (browsers submitting forms get the redirect/status behavior instead).

## Declaration options

| Option                     | Description                                                                                                                                  |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                     | The URL-visible action name. Names are platform-wide (shared with Java modules, last registration wins) — prefix them with your module name. |
| `requiredMethods`          | Allowed HTTP methods, e.g. `["POST"]`. Defaults to Jahia's default (GET and POST).                                                           |
| `requireAuthenticatedUser` | Defaults to **`true`** (Jahia's default): guests get a 401. Set to `false` explicitly for public actions.                                    |
| `requiredPermission`       | Permission required on the target node, e.g. `"jcr:write"`.                                                                                  |
| `requiredWorkspace`        | Restrict to `"default"` or `"live"`.                                                                                                         |

## The handler

The handler receives a context object:

- `parameters` — merged query-string and form parameters, as `Record<string, string[]>`,
- `resource` / `renderContext` / `session` — the target resource, render context and user JCR session,
- `request` — escape hatch: the raw `HttpServletRequest` (headers, cookies, body),
- `urlResolver` — escape hatch: the Jahia URL resolver.

And returns (possibly asynchronously — `async` handlers are supported, limited to microtask-based work: the server runtime has no timers or async I/O):

- `json` — an object serialized as the JSON response body,
- `statusCode` — HTTP status, default 200,
- `redirect` (+ `absoluteRedirect`) — redirect the client instead of returning a body.

Returning nothing sends an empty 200.

## CSRF protection for POST actions

POST, PUT and DELETE requests to `.do` URLs are blocked by Jahia's CSRF guard unless the URL is whitelisted. **This is your module's responsibility**: ship an OSGi configuration file in your module's `settings/configurations/` folder:

```properties
# settings/configurations/org.jahia.modules.jahiacsrfguard-mymodule.cfg
whitelist = *.myModuleSubmit.do,*.myModuleOther.do
```

Whitelisting disables CSRF protection for those URLs, so only do it for actions designed to be called without a CSRF token (e.g. public form submissions), and keep the patterns as narrow as possible. Without this file, POST calls to your action fail with a 403.

## Good to know

- **Keep handlers fast and non-blocking** — they run on a request thread.
- **Content modifications**: use the provided `session` to read/write JCR content as the calling user; standard permissions apply, plus `requiredPermission` if you set it.
- **Errors**: an exception thrown by the handler results in an error response; validate input and return explicit `statusCode` values (e.g. 400) for expected failures.
