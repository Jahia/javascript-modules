# Island Architecture

Jahia JavaScript Modules offers a first-class support for this architectural pattern, allowing interactivity without compromising on performance.

## What is Island Architecture?

We have written a [complete article on the topic,](https://www.jahia.com/blog/leveraging-the-island-architecture-in-jahia-cms) but here is a quick summary:

- Instead of shipping fully static or fully dynamic pages, Island Architecture is the middle ground where most of the page is static, but specific parts are made interactive on page load.

  [A page mockup with two interactive islands: a navigation bar and a video player](./islands.svg)

  In this example, the page is mostly static, with the exception of the `<Navigation />` and `<Video />` components, which are the islands of interactivity of the page. After the initial page load, JavaScript is used to make them interactive without affecting the rest of the page.

- Island Architecture offers the performance and SEO benefits of server-side rendering, but makes it easy to create highly interactive user experiences.

- The difference between islands and using server-side rendering with a bit of jQuery is that, when building islands, the exact same React components run on the server and the client. Having a single-language codebase is easier to maintain in the long run.

## The `<Island />` component

The `<Island />` component is the base of the Island Architecture in Jahia. It can be imported from the `@jahia/javascript-modules-library` and used in any React view or template:

```tsx
import { Island } from "@jahia/javascript-modules-library";
```

As with all imports from `@jahia/javascript-modules-library`, the `<Island />` component **can only be used on the server.**

Server files, files in `.server.tsx`, are used as entry points for your server code. They contain views and templates to be registered by Jahia.

Client files, files in `.client.tsx`, are used as entry points for your client code. All client files, as well as all their imports, will be made available for the browser to download. They should not contain any sensitive information, and cannot import server APIs (`@jahia/javascript-modules-library` and `.server.tsx` files).

In client files, **only the default export** can be used to create an island. For instance, here is a minimal interactive button:

```tsx
// Button.client.tsx
export default function Button() {
  return (
    <button
      // Attach an event listener to the button
      onClick={() => {
        alert("Button clicked!");
      }}
    >
      Click me!
    </button>
  );
}
```

If you use this button directly in a server file, it will not work as you might have expected:

```tsx
// default.server.tsx
import { jahiaComponent } from "@jahia/javascript-modules-library";
import Button from "./Button.client.tsx";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "hydrogen:example",
  },
  () => (
    <article>
      <h1>Hello World</h1>
      <p>
        {/* ❌ Do not do that, it does not work */}
        <Button />
      </p>
    </article>
  ),
);
```

Your button will be sent properly to the client, but **not be made interactive.** This is because the default rendering mode of JavaScript Modules (and Jahia in general) is server-side rendering. **No JS is sent to the browser by default,** and therefore your button doesn't get its event listener attached.

The solution is the `<Island />` component:

```tsx
// default.server.tsx
import { Island, jahiaComponent } from "@jahia/javascript-modules-library";
import Button from "./Button.client.tsx";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "hydrogen:example",
  },
  () => (
    <article>
      <h1>Hello World</h1>
      <p>
        {/* ✅ This works*/}
        <Island component={Button} />
      </p>
    </article>
  ),
);
```

The `<Island />` component always takes a `component` prop, which is the React component to be rendered as an island. It must be the default export from a `.client.tsx` file, otherwise it will not work.

It can also take other props, which are detailed in the following sections.

## `clientOnly`

By default, all islands are rendered on the server and made interactive on the client (the process is called [hydration](https://18.react.dev/reference/react-dom/client/hydrateRoot#hydrating-server-rendered-html)). This is great for the perceived performance of your application because even before being interactive, your page can be read by the user.

Sometimes, the server cannot render the content (for instance, because it needs browser APIs like `window`, `document` or `navigator`). For these cases, the `<Island />` component has a `clientOnly` mode, which will skip server-side rendering and only render your component on the client.

```tsx
// Language.client.tsx
export default function Language() {
  // The `navigator.language` API is only available in the browser,
  // and would error on the server as being undefined
  return <p>According to your browser, you speak {navigator.language}.</p>;
}
```

```tsx
// default.server.tsx
import { Island, jahiaComponent } from "@jahia/javascript-modules-library";
import Language from "./Language.client.tsx";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "hydrogen:example",
  },
  () => (
    <article>
      <Island
        clientOnly // <- Skip server-side rendering
        component={Language}
      />
    </article>
  ),
);
```

This ensures that `<Language />` only runs on the client (the browser).

## `props`

Your island component, as any React component, may take props. To do so, pass all the props of your component through the `props` prop of `<Island />`.

Because these props will be sent to the browser, two constraints apply:

- **Do not pass any sensitive information,** such as API keys.
- **The props must be serializable,** which means only a subset of all JS objects can be used. The serialization is performed by [devalue](https://www.npmjs.com/package/devalue), which offers a wider range of supported types than `JSON.stringify`, but still has limitations. For instance, you cannot send a JCR node through the props of a client component.

Here is an example of what you can do:

```tsx
// Pizza.client.tsx
export default function Pizza({
  toppings,
  selection,
}: {
  /** All available pizza ingredients */
  toppings: string[];
  /** The user's current selection */
  selection: Set<string>;
}) {
  return (
    // You can use React fragments, your island does not have to be a single element
    <>
      <h2>Available toppings:</h2>
      <ul>
        {toppings.map((topping) => (
          <li key={topping}>
            {topping} {selection.has(topping) ? "(selected)" : "(not selected)"})
          </li>
        ))}
      </ul>
    </>
  );
}
```

```tsx
// default.server.tsx
import { Island, jahiaComponent } from "@jahia/javascript-modules-library";
import Pizza from "./Pizza.client.tsx";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "hydrogen:example",
  },
  () => (
    <article>
      <Island
        component={Pizza}
        props={{
          // The props must be serializable per devalue
          toppings: ["cheese", "pepperoni", "mushrooms"],
          selection: new Set(["cheese"]),
        }}
      />
    </article>
  ),
);
```

Our `<Pizza />` component receives its props during both server-side and client-side rendering.

## `children`

Last but not least, the `children` prop, which is the technical name for all children passed to a React component. (`<Parent children={<Child />} />` is the same as `<Parent><Child /></Parent>`.)

The `<Island />` component can take children, but its behavior depends on its `clientOnly` prop.

In default mode (without `clientOnly`), the children are rendered on the server and sent to the client, as children of your island component. The children will not be made interactive.

This behavior enables components like accordions, where the `<Island />` is not a leaf of the component tree.

[Schema of the accordion component](./accordion.svg)

Such a component can be implemented as follows:

```tsx
// Accordion.client.tsx
import type { ReactNode } from "react";

export default function Accordion({ children }: { children: ReactNode }) {
  // The accordion can be opened and closed
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setIsOpen(!isOpen)}>{isOpen ? "Close" : "Open"} accordion</button>
      <div style={{ display: isOpen ? "block" : "none" }}>
        {/* Children will be inserted here: */}
        {children}
      </div>
    </div>
  );
}
```

And on the server:

```tsx
// default.server.tsx
import { Island, jahiaComponent } from "@jahia/javascript-modules-library";
import Accordion from "./Accordion.client.tsx";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "hydrogen:example",
  },
  () => (
    <article>
      <Island component={Accordion}>
        <p>I'm rendered on the server!</p>
      </Island>
    </article>
  ),
);
```

A few things to note:

- The `{children}` insertion point must always be there. If you want to hide the children of your component, use CSS instead of a JS condition. Otherwise, they will not be sent to the client and your component will appear to have no children.
- Children will be wrapped in a `jsm-children` element. This should not affect your code most of the time, but don't use the `>` CSS selector to target children of your component.

In `clientOnly` mode, the children of an island will not be used as children of your island component. Instead, they will be rendered on the server and used as a placeholder until the client component is loaded.

```tsx
// default.server.tsx
import { Island, jahiaComponent } from "@jahia/javascript-modules-library";
import Map from "./Map.client.tsx";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "hydrogen:example",
  },
  () => (
    <article>
      <Island component={Map}>
        {/* Placeholder until <Map /> has loaded */}
        <p>The map is loading...</p>
      </Island>
    </article>
  ),
);
```

This is a good UX practice to tell users that your site is currently loading instead of leaving an empty space. It can also prevent [layout shifts](https://web.dev/articles/cls) when the component finally loads.

## Implementation details

It is not necessary to know any of this to create a successful Jahia integration, but it might come in handy if you need to debug your application:

- The `<Island />` component will be sent to the client as a `<jsm-island />` custom element. In client only mode, it will have a `data-client-only` attribute.

  Do not target `jsm-island` nor `jsm-children` in your CSS as they are implementation details and may change in non-major versions.

- Client-side libraries used by your islands will be imported on the server, by the chain of top-level imports:

  ```ts
  // Map.client.tsx
  import { foo, bar } from "map-provider";

  export default function Map() {}

  // default.server.tsx
  import Map from "./Map.client.tsx"; // Will indirectly import "map-provider"
  ```

  This is not an issue for modern, well-built libraries, but can be troublesome for libraries with top-level side effects. If you have error messages on the server like `window/document is not defined`, it is likely that one of your dependencies is not compatible with server-side rendering (SSR).

  To work around this problem, you can use the `import()` function in an effect instead of a top-level import:

  ```tsx
  // Map.client.tsx
  import { useEffect } from "react";

  export default function Map() {
    // useEffect only runs on the client, it is skipped during SSR
    useEffect(() => {
      import("map-provider").then(({ foo, bar }) => {
        // Use foo and bar here
      });
    }, []);
  }

  // default.server.tsx
  import Map from "./Map.client.tsx"; // "map-provider" no longer imported here
  ```

  You can also report this issue (_the library is not compatible with server-side rendering_) to the library maintainers.

- We have written a complete article on the implement details of the `<Island />` component. You can read it on our blog: [Under the Hood: Hydrating React Components in Java](https://www.jahia.com/blog/under-the-hood-hydrating-react-components-in-java).
