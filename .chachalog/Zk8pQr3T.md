---
# Allowed version bumps: patch, minor, major
javascript-modules: minor
---

`<Island>` now accepts client components exported by name, not only default exports: the Vite plugin tags every export of a `*.client.{jsx,tsx}` file, and the browser loader picks the right one. A component that carries no hydration metadata (declared outside a client file, or re-exported through an `export { … }` list) now fails at render with an explicit message, instead of silently making the browser request `undefined.js`. (#706)
