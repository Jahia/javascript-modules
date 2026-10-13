---
# Allowed version bumps: patch, minor, major
javascript-modules: minor
---

`buildEndpointUrl`, `buildNodeUrl` and `buildModuleFileUrl` now accept an `absolute` option to prefix the URL with the server host.

```jsx
<meta property="og:url" content={buildNodeUrl(currentNode, { absolute: true })} />
```

- Set `absolute` to a string such as `"https://www.example.com"` to choose the origin.
- A URL that Jahia already made absolute, such as a live link to another site, keeps its own origin.
- `buildEndpointUrl` throws when `absolute` is set and the endpoint does not start with `/`.
- In preview and edit, Jahia removes the origin from an `href` or a `src` that contains `/cms/render`. Use the URL in an attribute such as `content` or `data-*` there.
