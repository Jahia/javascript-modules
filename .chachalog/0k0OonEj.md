---
# Allowed version bumps: patch, minor, major
javascript-modules: minor
---

Added a link API to the library: the `<JLink>` component, and the `getLinkProps` / `resolveContentLink` functions behind it. (#749)

`<JLink node={page}>` builds the URL, registers the render cache dependency on the target, and marks the current page with `aria-current="page"`. A target that does not resolve is treated as a result rather than an error: the children are rendered without an anchor, instead of the whole section being replaced by an error comment. That is the normal state of a link to a page that is not published yet.

`<JLink content={node}>` reads a link off a content node — `jnt:nodeLink`, `jnt:externalLink`, or the `j:linkType` convention under whichever property names your project uses. Anchor `target` is validated against the four values `jmix:link` allows, `rel="noopener noreferrer"` is added to `_blank`, and every URL the library did not build itself goes through a scheme allow-list, so an author-supplied `javascript:` or `data:` URL is never rendered. Islands take the same data as `<a {...anchor}>`.

See the new [Links guide](https://github.com/Jahia/javascript-modules/blob/main/docs/2-guides/9-links/README.md) for the cache-dependency key forms, the `cache.mainResource=true` rule that current-page state requires, and what core rewrites after the render.
