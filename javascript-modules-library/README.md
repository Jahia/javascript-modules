# @jahia/javascript-modules-library

This library exposes common types and utility functions for JavaScript modules running in a Jahia environment. It exposes the following APIs:

## Rendering components

### `Island`

This component creates an island of interactivity on the page, following the [Island Architecture](https://www.jahia.com/blog/leveraging-the-island-architecture-in-jahia-cms) paradigm.

```tsx
<Island component={MyComponent} props={{ foo: "bar" }}>
  <div>If MyComponent takes children, it will receive them here.</div>
</Island>
```

It takes an optional `clientOnly` prop:

- By default or when set to `false`, the component will be rendered on the server and hydrated in
  the browser. In this case, children are passed to the component.
- When set to `true`, the component will be rendered only in the browser, skipping the server-side
  rendering step. This is useful for components that cannot be rendered on the server. In this
  case, children are used as a placeholder until the component is hydrated.

### `RenderInBrowser` (deprecated)

This component is used to render a React component in the browser. It is used to render a component in the browser, skipping the server-side rendering step. Provided children, if any, will be rendered on the server and replaced by the component in the browser.

```tsx
<RenderInBrowser child={MyComponent} props={{ foo: "bar" }}>
  <div>Loading...</div>
</RenderInBrowser>
```

This component is deprecated and will be removed in the future major version. Use the `Island` component with the `clientOnly` prop instead.

### `HydrateInBrowser` (deprecated)

This component is used to hydrate a React component in the browser. It will be rendered on the server then hydrated in the browser. Provided children, if any, will be children of the component.

```tsx
<HydrateInBrowser child={MyComponent} props={{ foo: "bar" }}>
  <div>I'm a child of MyComponent</div>
</HydrateInBrowser>
```

This component is deprecated and will be removed in the future major version. Use the `Island` component instead.

### `Render`

This component renders a Jahia component out of a node or a JS object.

```tsx
// Render a JCR node
<Render node={node} />

// Render a JS object
<Render content={{ nodeType: "ns:nodeType" }}>
```

### `RenderChild`

This component renders a child node of the current node. It's a thin wrapper around `Render` and `AddContentButtons`.

```tsx
<RenderChild name="child" />
```

### `RenderChildren`

This component renders all children of the current node. It's a thin wrapper around `Render`, `getChildNodes` and `AddContentButtons`.

```tsx
<RenderChildren />
```

## Components

### `AbsoluteArea`

This component creates an absolute area in the page. It's an area of user-contributable content, child of the node of your choice.

```tsx
<AbsoluteArea name="footer" parent={renderContext.getSite().getHome()} />
```

### `Area`

This component creates an area in the page. It's an area of user-contributable content that is local to the page where it is present.

```tsx
<Area name="main" />
```

### `AddContentButtons`

This component renders a set of buttons to add content to the current node.

```tsx
<AddContentButtons />
```

### `AddResources`

This component adds resources to the page, making sure they are loaded only once and insert them at the desired position.

```tsx
<AddResources type="css" resources="styles.css" />
```

## Declaration and registration

### `jahiaComponent`

This function is used to declare a Jahia component. It takes a component definition as first argument, and a React component as second argument.

```tsx
jahiaComponent(
  {
    componentType: "view",
    nodeType: "ns:hello",
  },
  ({ name }: { name: string }) => {
    return <h1>Hello {name}!</h1>;
  },
);
```

The first argument of the component function is an object containing the JCR properties of the node being rendered. The server context is passed as the second argument. See `useServerContext` for more information.

## Hooks

### `useGQLQuery`

This hook is used to execute a GraphQL query on the current Jahia instance.

```tsx
const { data, errors } = useGQLQuery({
  query: /* GraphQL */ `
    query MyQuery($workspace: Workspace!) {
      jcr(workspace: $workspace) {
        workspace
      }
    }
  `,
  variables: {
    workspace: "LIVE",
  },
});
```

### `useJCRQuery`

This hook is used to execute a JCR query on the current Jahia instance.

```tsx
const pages = useJCRQuery({ query: "SELECT * FROM [jnt:page]" });
```

### `useServerContext`

This hook is used to access the server context, which contains information about the current node, page, and rendering context.

```tsx
const {
  /**
   * Jahia's rendering context, it provides access to all kinds of context information, such as the
   * current request, response, user, mode, mainResource and more
   */
  renderContext,
  /**
   * The current resource being rendered, which is a combination of the current node and its
   * template/view information
   */
  currentResource,
  /** The current JCR node being rendered */
  currentNode,
  /** The main JCR node being rendered, which is the root node of the current page */
  mainNode,
  /** The OSGi bundle key of the current module being rendered */
  bundleKey,
} = useServerContext();
```

You do not need to use this hook when rendering a component with `jahiaComponent`, as the server context is passed as the second argument of the component function.

## JCR utils

### `getChildNodes`

This function is used to get the child nodes of a JCR node.

```tsx
const children = getChildNodes(node, limit, offset, filter);
```

### `getNodeProps`

This function is used to get the properties of a JCR node.

```tsx
const { title, description } = getNodeProps(node, ["title", "description"]);
```

### `getNodesByJCRQuery`

This function is used to get nodes by a JCR query.

```tsx
const pages = getNodesByJCRQuery(session, "SELECT * FROM [jnt:page]", limit, offset);
```

## URL builder

### `buildEndpointUrl`

This function transforms a path to an endpoint into a full URL.

```tsx
const dashboard = buildEndpointUrl("/jahia/dashboard");
```

### `buildNodeUrl`

This function transforms a JCR node into a full URL to the node.

```tsx
const home = buildNodeUrl(renderContext.getSite().getHome().getNode());
```

### `buildModuleFileUrl`

This function transforms a path to a file in the module into a full URL.

```tsx
const styles = buildModuleFileUrl("dist/styles.css");
```

If the path has a protocol (e.g. `data:` URI), it will be returned as is, pairing nicely with [Vite static asset imports.](https://vite.dev/guide/assets.html#importing-asset-as-url)

## Java server API

### `server`

This variable provides access to the Java server API.

```tsx
const bundle = server.osgi.getBundle(bundleKey);
```

## Remarks

This module does not contain actual implementations of the components and hooks. All imports of `@jahia/javascript-modules-engine` must be preserved during the build. This is done automatically if you use [@jahia/vite-plugin](https://www.npmjs.com/package/@jahia/vite-plugin).
