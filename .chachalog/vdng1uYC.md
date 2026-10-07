---
# Allowed version bumps: patch, minor, major
javascript-modules: minor
---

`buildEndpointUrl`, `buildNodeUrl` and `buildModuleFileUrl` now accept an `absolute` option to prefix the URL with the server host.

```jsx
<meta property="og:url" content={buildNodeUrl(currentNode, { absolute: true })} />
```
