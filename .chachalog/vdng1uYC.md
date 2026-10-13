---
# Allowed version bumps: patch, minor, major
javascript-modules: minor
---

Added an `absolute` option to `buildEndpointUrl`, `buildNodeUrl` and `buildModuleFileUrl`, which prefixes the URL with the server origin or with an origin passed as a string.

```jsx
<meta property="og:url" content={buildNodeUrl(currentNode, { absolute: true })} />
```

In preview and edit, Jahia removes the origin from a page URL in an `href` or `src` attribute, so use the URL in an attribute such as `content` there.
