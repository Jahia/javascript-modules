---
# Allowed version bumps: patch, minor, major
javascript-modules: minor
---

Made the link API usable on a real site: an open `attributes` map, `asChild`, the label of a link mixin, a narrowable scheme allow-list, and an edit-mode URL that is correct wherever it is put. (#768, #769, #770, #771, #772)

`<JLink>` no longer pushes a caller off the component. `attributes` takes a record or a function of the resolved link — `({ anchor, state }) => ({ "data-element-url": anchor.href, "data-element-text": state.label })` — which is the only way to reach `data-*` and the only way to read back the URL and the label the component computed. `asChild` hands the link to the element you render, for a call to action that is not a bare `<a>`. The anchor attributes the component accepts are now derived from its own props rather than hand-listed, so a prop added later cannot silently swallow one.

A link mixin sits on a node whose `jcr:title` is the heading, not the link label; `labelProperties` and `labelFrom` say where the label really lives. `state.node` returns what the link resolved to, and the safe reference read behind it is exported as `readNodeReference`, next to `getNodeProps` — reading a `weakreference` without letting a dangling one break the render is a JCR concern, not a link one. The scheme allow-list can be narrowed, per call with `allowedSchemes` or once per module with `setLinkDefaults`; it narrows only, and says so on a development instance.

`buildNodeUrl` now emits `/cms/editframe/…` for edit mode. `/cms/edit/…` does not render a page on 8.2.3 — it redirects to the jContent UI — and only reached one because `EditModeFilter` substitutes the two for an `a[href]` and nothing else, so the same URL in an Island payload or a `data-*` attribute pointed at a second copy of jContent. The [Links guide](https://github.com/Jahia/javascript-modules/blob/main/docs/2-guides/9-links/README.md) now states which contexts core finishes a URL in and which it leaves alone.
