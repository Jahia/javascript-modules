---
page:
  $path: /sites/academy/home/documentation/jahia/8_2/developer/javascript-module-development/actions
  jcr:title: Actions
  j:templateName: documentation
content:
  $subpath: document-area/content
---

Actions are server functions callable from client components (islands) as if they were local async functions. You write the function once; the build compiles it twice — the real implementation for the server, a typed network stub for the client — so calling server code from the browser is a plain `await`.

## Writing an action

Any file ending in `.action.ts` (or `.action.js`) exports actions. The file can be named anything and placed anywhere under `src/`:

```ts
// src/actions/rates.action.ts
export const getExchangeRate = async (currency: string) => {
  // this code only ever runs on the server
  return lookupRate(currency);
};
```

## Calling an action from the client

Import the function from a client component and call it:

```tsx
// src/components/Rate.client.tsx
import { useState } from "react";
import { getExchangeRate } from "../actions/rates.action";

export default function Rate({ initialValue }: { initialValue: number }) {
  const [rate, setRate] = useState(initialValue);
  return (
    <button onClick={async () => setRate(await getExchangeRate("EUR"))}>
      Rate: {rate}. Click to refresh.
    </button>
  );
}
```

As far as TypeScript is concerned this is a local function call; at runtime the client performs a network request. Arguments and return values are serialized with [devalue](https://github.com/sveltejs/devalue), so `Date`, `Map`, `Set`, `RegExp`, cyclic structures etc. survive the round trip — but functions, class instances and other non-serializable values do not.

A thrown (or rejected) server error rejects the client call with an `Error`. Only deliberate error types carry their message to the caller: throw `ActionError` (exported by the library) for user-facing failures like `throw new ActionError("Out of stock")`. Any other exception is logged on the server and replaced by a generic message in the response — actions are guest-callable, and unexpected error messages can leak implementation details.

## Safe actions (input validation)

Wrap the implementation with `action` and any [Standard Schema](https://standardschema.dev) compatible schema (zod, valibot, arktype, …). The implementation only runs on valid input, and its parameter type is inferred from the schema:

```ts
// src/actions/rates.action.ts
import { action } from "@jahia/javascript-modules-library";
import { z } from "zod";

export const getExchangeRate = action(z.object({ currency: z.string() }), ({ currency }) => {
  return lookupRate(currency);
});
```

On invalid input the client call rejects with an error carrying the validation `issues`.

## How it works, and its limits

- Each export becomes a callable endpoint named `<moduleName>/<exportName>`. Export names must be unique across all the `.action.ts` files of your module (duplicates fail at module startup).
- Only top-level `export const <name> = …` and `export function <name>` declarations are picked up; `export { … }` lists, `export default` and re-exports are not supported in action files.
- Actions run synchronously on a server thread. `async`/`await` over synchronous work is fully supported, but there are no timers and no asynchronous I/O in the server runtime — a promise that relies on them never settles and the call fails.
- The client stub POSTs to the current page URL (`<page>.jsAction.do`); calls execute with the visitor's session and permissions. **Guests can call your actions**: treat inputs as untrusted and enforce your own permission checks inside the function.
- Requests carry a mandatory `X-JS-Action` header, which protects the endpoint against classic CSRF (HTML forms cannot set headers; cross-origin scripts would need a CORS preflight that Jahia does not grant).

## Calling an action without the client stub

Tests, server-to-server integrations and `curl` can call the endpoint directly. It always answers a JSON envelope — `{"data": "<devalue>"}` on success, `{"error": "…", "issues": [...]}` on failure — with a status describing the outcome:

| Status | Meaning                                                                                                                              |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `200`  | the function returned; `data` holds its devalue-encoded result                                                                        |
| `400`  | caller mistake: missing `X-JS-Action` header, missing `name` parameter, malformed body, or input rejected by the schema (`issues`)    |
| `404`  | no action is registered under that name                                                                                               |
| `500`  | the function threw, or the runtime could not complete the call                                                                        |

```sh
curl -X POST "http://localhost:8080/sites/my-site/home.jsAction.do?name=my-module%2FgetExchangeRate" \
  -H "X-JS-Action: 1" \
  --data-binary '[[1],{"currency":2},"EUR"]'
```

Arguments travel as a [devalue](https://github.com/sveltejs/devalue)-encoded **array** of the function's parameters, and `data` comes back devalue-encoded too — that is what preserves `Date`, `Map`, `Set` and friends across the wire.

## When to use what

| Need                                                                                   | Use                                                       |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Call server code from an island                                                        | **Actions** (this page)                                   |
| Expose a `.do` HTTP endpoint on a content node (plain form POST, external integration) | [Legacy node actions](../4-legacy-node-actions/README.md) |
| Expose data in the content graph                                                       | GraphQL extensions                                        |
