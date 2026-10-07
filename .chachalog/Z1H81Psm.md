---
# Allowed version bumps: patch, minor, major
javascript-modules: minor
---

Added support for children in client-only islands: `<Island clientOnly>` now passes its children to the component. (#807)

Use `clientOnly="hide-children-while-loading"` to hide them until the component is loaded, for instance when they must only be displayed in a modal.
