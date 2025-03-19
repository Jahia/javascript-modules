# @jahia/javascript-modules-library

This library exposes common types and utility functions for JavaScript modules running in a Jahia environment. It exposes the following APIs:

## Rendering components

### `RenderInBrowser`

This component is used to render a React component in the browser. It is used to render a component in the browser, skipping the server-side rendering step. Provided children, if any, will be rendered on the server and replaced by the component in the browser.

```tsx
<RenderInBrowser child={MyComponent} props={{ foo: "bar" }}>
  <div>Loading...</div>
</RenderInBrowser>
```

### `HydrateInBrowser`

This component is used to hydrate a React component in the browser. It will be rendered on the server then hydrated in the browser. Provided children, if any, will be children of the component.

```tsx
<HydrateInBrowser child={MyComponent} props={{ foo: "bar" }}>
  <div>I'm a child of MyComponent</div>
</HydrateInBrowser>
```

### `Render`

This component renders a Jahia component out of a node or a JS object.

```tsx
// Render a JCR node
<Render node={node} />

// Render a JS object
<Render content={{ nodeType: "ns:nodeType" }}>
```

## Components

### `AbsoluteArea`

This component creates an absolute area in the page. It's an area of user-contributable content that is synchronized between all pages where it is present.

```tsx
<AbsoluteArea name="footer" />
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

This function is used to declare a new Jahia component. It takes a component definition as first argument, and a React component as second argument.

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

### `useUrlBuilder`

This hook provides URL building utilities.

```tsx
const {
  /** Builds a static URL for an asset. */
  buildStaticUrl,
  /** Builds a URL for a JCR node. */
  buildNodeUrl,
  /** Builds an HTML fragment URL for a JCR node. */
  buildHtmlFragmentUrl,
} = useUrlBuilder();
```

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

### `buildUrl`

This function is used to build a URL.

```tsx
const url = buildUrl({ path: "/path/to/resource" }, renderContext, currentResource);
```

## Java server API

### `server`

This variable provides access to the Java server API.

```tsx
const bundle = server.osgi.getBundle(bundleKey);
```

## Remarks

This module does not contain actual implementations of the components and hooks. All accesses to `@jahia/javascript-modules-engine` must be replaced by `javascriptModulesLibraryBuilder.getSharedLibrary('@jahia/javascript-modules-engine')` in the final bundle. This is done automatically during the build process if you use [@jahia/vite-plugin](https://www.npmjs.com/package/@jahia/vite-plugin).
