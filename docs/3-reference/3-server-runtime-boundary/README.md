<!-- too incomplete to publish on the academy -->

# Server runtime boundary

JavaScript modules run in **two different runtimes**, and they are not the same:

| Where                                                                       | Runtime                                | What you get                                                     |
| --------------------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------- |
| `*.client.{jsx,tsx}` (hydrated islands)                                     | The visitor's **browser**              | The whole web platform: DOM, `fetch`, timers, `WebSocket`, …     |
| `*.server.{jsx,tsx}`, `*.action.{js,ts}`, views, and everything they import | **GraalJS**, embedded in the Jahia JVM | Plain ECMAScript, plus the `server` bridge exposed by the engine |

The server runtime is **not Node.js and not a browser**. It is a bare
[GraalJS](https://www.graalvm.org/latest/reference-manual/js/) context created by the engine, with
no Node.js compatibility layer, no timers, and no I/O.

Getting this wrong is only discovered when the page renders. Calling `setTimeout` in an action, for
instance, answers:

```json
{ "error": "setTimeout is not defined" }
```

To turn that into an editor squiggle, the `eslint.config.js` shipped by
[`@jahia/create-module`](../../../javascript-create-module) restricts the unavailable globals and
Node.js built-in imports in server files. See [Lint rule](#lint-rule) below.

## The async model: microtasks only

There **is** a `Promise`, and `async`/`await` works. What is missing is the _event loop_ around it:
GraalJS drains the microtask queue after your code returns, but nothing ever schedules a macrotask.
In practice:

- `await somePromise` resolves fine, as long as something already resolved it synchronously.
- `await new Promise((resolve) => setTimeout(resolve, 100))` cannot work — there is no `setTimeout`,
  and even if you polyfilled one with a Java thread, nothing would pump the callback back into the
  JS context.
- Rendering is **synchronous** from Jahia's point of view: the engine calls your view and expects
  HTML back. There is no point at which the runtime waits for pending work.

### A nested call cannot settle a promise

GraalJS drains the microtask queue only when the **outermost** JavaScript frame returns to the host:
it counts how deep the host has called into JavaScript, and processes pending promise jobs when that
count reaches zero
([`JSAgent`](https://github.com/oracle/graaljs/blob/master/graal-js/src/com.oracle.truffle.js/src/com/oracle/truffle/js/runtime/JSAgent.java)).
So `async` works where Jahia calls your code with nothing else running, and never works where your
callback is reached from inside another JavaScript execution: even `async () => 42` stays pending
there, and the render or the save fails.

| Your code                                                         | May be `async`? | Why                                                                 |
| ----------------------------------------------------------------- | --------------- | ------------------------------------------------------------------- |
| A view, an action, a legacy node action, a choicelist initializer | Yes             | Jahia calls it from a request, with no JavaScript on the stack.     |
| A node validator (`registerNodeValidator`)                        | No              | A save issued from server JavaScript runs it inside that execution. |
| A render filter (`registerRenderFilter`)                          | No              | A `<Render>` component in a view runs it inside that execution.     |

The two wrappers that take such a callback exclude promises from its type and refuse an `async`
function when the module registers it, so the failure happens once, at startup, instead of on the
call paths that happen to be nested. The [lint rule](#lint-rule) reports it in the editor.

This is a property of GraalJS rather than a Jahia choice, and the current GraalJS release behaves
the same way.

This is why the JavaScript modules library exposes _synchronous_ helpers (`useGQLQuery`,
`getNodeProps`, `getChildNodes`, …) instead of promise-based ones: the data is fetched by the JVM,
in the calling thread, and handed back to JS.

**Consequence for npm packages:** any package whose core job is I/O — HTTP clients, database
drivers, most cloud SDKs, anything built on `node:fs`, `node:http` or `fetch` — cannot run in a
server file, no matter how it is bundled. Pure-computation packages (date formatting, validation,
markdown rendering, …) work fine.

## What is available

Verified against GraalJS `23.0.5`, the version embedded by the engine (see `graalvm.version` in the
root `pom.xml`), with the same context options as
`GraalVMEngine.ContextPoolFactory#create`:

- **All of ECMAScript**: `Object`, `Array`, `Map`, `Set`, `WeakMap`, `WeakRef`,
  `FinalizationRegistry`, `Proxy`, `Reflect`, `Symbol`, `BigInt`, `JSON`, `Math`, `Date`, `RegExp`,
  `Error` and friends, `Promise`, `globalThis`, `Intl`, `Atomics`, `SharedArrayBuffer`, typed
  arrays…
- **`console`** — `console.log` and friends are wired to the server logs. This is the way to debug a
  server view.
- **`TextEncoder` / `TextDecoder`** — not native to GraalJS, but polyfilled by the engine at startup
  (`javascript-modules-engine/src/server/index.ts` imports `fast-text-encoding`).
- **`server`** — the global bridge the engine injects (`server.render`, `server.gql`, `server.jcr`,
  `server.registry`, `server.osgi`, `server.config`). Use
  [`@jahia/javascript-modules-library`](../../../javascript-modules-library) rather than touching it
  directly.
- **ES modules** — `import` / `export` between your own files, bundled by Vite before they ever
  reach the server.
- GraalVM's polyglot globals (`Java`, `Polyglot`, `Graal`, `print`, `load`) are technically present,
  but they are **not** part of the supported API surface: do not build on them.

## What is not available

Every name below was verified to be `undefined` in the engine's GraalJS context. They are also the
exact list restricted by the lint rule.

| Group               | Names                                                                                                                                                               | Why                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Timers & scheduling | `setTimeout`, `setInterval`, `clearTimeout`, `clearInterval`, `setImmediate`, `clearImmediate`, `queueMicrotask`                                                    | There is no event loop, only the microtask queue used by promises.              |
| Network & async I/O | `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `Request`, `Response`, `Headers`, `FormData`, `Blob`, `File`, `FileReader`, `AbortController`, `AbortSignal` | The server runtime cannot perform asynchronous I/O.                             |
| Node.js             | `process`, `Buffer`, `global`, `require`, `module`, `exports`, `__dirname`, `__filename`, and every `node:*` / bare built-in import                                 | The server runtime is not Node.js.                                              |
| Browser             | `window`, `document`, `navigator`, `localStorage`, `alert`                                                                                                          | The server runtime is not a browser. Move this code to a `*.client.tsx` island. |
| Web platform extras | `URL`, `URLSearchParams`, `structuredClone`, `crypto`, `performance`, `btoa`, `atob`                                                                                | Not part of ECMAScript, and GraalJS does not provide them.                      |

Other web APIs that are equally absent but not restricted (because they are rarely reached for by
mistake) include `Worker`, `MessageChannel`, `BroadcastChannel`, `EventTarget`, `CustomEvent`,
`ReadableStream`, `WritableStream` and `TransformStream`.

### `process.env.NODE_ENV`

`process` does not exist at runtime, but `process.env.NODE_ENV` is a **special case**: the Vite
plugin statically replaces that exact expression at build time (see the `define` option in
`vite-plugin/src/index.ts`), so the string never reaches the server. It is the one `process` usage
that works, and it needs an explicit opt-out:

```tsx
// eslint-disable-next-line no-restricted-globals -- process.env.NODE_ENV is inlined at build time
const isDev = process.env.NODE_ENV !== "production";
```

Nothing else on `process` — `process.env.MY_VAR`, `process.cwd()`, `process.argv` — will work.

## What to do instead

| You want to…                     | Do this                                                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Call an HTTP API                 | Do it from a `*.client.tsx` island, or from Java/OSGi and expose the result through GraphQL.            |
| Query content                    | Use the synchronous helpers of `@jahia/javascript-modules-library` (`useGQLQuery`, `getChildNodes`, …). |
| Read configuration               | Use `server.config` through the library, or an OSGi configuration — not `process.env`.                  |
| Read or write files              | Use the JCR, through the library — not `node:fs`.                                                       |
| Debounce, poll, animate          | Client side only. Anything time-based belongs in an island.                                             |
| Use an npm package that does I/O | It won't run server side. Move the call to the browser, or to a Java service.                           |

## Lint rule

The `eslint.config.js` generated by `@jahia/create-module` contains a config block scoped to
`**/*.server.{js,jsx,ts,tsx}` and `**/*.action.{js,ts}`:

- `no-restricted-globals` — one entry per name in the table above, each message naming the reason
  and linking back to this page.
- `no-restricted-imports` — `node:*` specifiers and bare Node.js built-in module names (`fs`,
  `path`, `crypto`, `fs/promises`, …).

A second block reports an `async` callback passed to `registerNodeValidator` or
`registerRenderFilter` (`no-restricted-syntax`), for the reason given in
[A nested call cannot settle a promise](#a-nested-call-cannot-settle-a-promise). That one is not
scoped to server files: these registrations are often declared in a plain module imported by a
server entry point.

Client files are deliberately untouched: `fetch`, `window` and timers are perfectly valid in a
`*.client.tsx` file.

The rule is **syntactic**: it only sees what a server file writes itself. It does not follow imports,
so a helper in `src/utils/http.ts` calling `fetch` is not reported even though it will fail at
runtime. A flow-aware check (or a build-time scan of the server bundle) is a possible follow-up.

The same block is dogfooded by this repository's own configs (`eslint.config.js` at the root and
`samples/hydrogen/eslint.config.js`); keep the three copies in sync.
