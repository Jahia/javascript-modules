---
# Allowed version bumps: patch, minor, major
javascript-modules: minor
---

`<Island clientOnly>` now passes its children to the island component, like server-rendered islands do.

Children are displayed until the component is loaded, then moved into it. Components that do not render their children are unaffected: the children still act as a loading placeholder.

Use `<Island clientOnly="hide-children-while-loading">` to hide the children until the component is loaded, for instance when they must only be displayed inside a modal.
