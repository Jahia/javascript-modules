---
page:
  $path: /sites/academy/home/documentation/jahia/8_2/developer/javascript-module-development/links
  jcr:title: Links
  j:templateName: documentation
content:
  $subpath: document-area/content
---

Almost every component ends up rendering a link, and a link in a CMS is not just an `<a href>`: the target may not exist yet, the URL depends on the mode and the language, the fragment that contains the link is cached, and the page builder rewrites what you emit. This guide covers the `<JLink>` component and the two functions behind it.

## The one-liner

Name the target, and you get a correct link:

```tsx
import { JLink, jahiaComponent } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";

type Props = { "title": string; "j:linknode": JCRNodeWrapper };

jahiaComponent({ componentType: "view", nodeType: "example:card" }, (props: Props) => (
  <JLink node={props["j:linknode"]}>{props.title}</JLink>
));
```

That single line builds the URL through `buildNodeUrl`, registers a render cache dependency on the target, adds `aria-current="page"` when the target is the page being rendered, and — when the target cannot be linked to — renders `title` without an anchor.

`<JLink>` accepts exactly one of three targets:

| Prop      | Use it for                                                                                    |
| --------- | --------------------------------------------------------------------------------------------- |
| `node`    | A JCR node you already have, from a property or a query.                                      |
| `content` | A content node that _describes_ a link — a `jnt:nodeLink`, a `jnt:externalLink`, a CTA mixin. |
| `href`    | A URL you built yourself, or one that comes from outside Jahia.                               |

Everything else you pass is a plain anchor attribute: `className`, `hreflang`, `download`, `onClick`. There is no styling of its own.

## Attributes the component does not know about

Two things a real site needs, and neither is expressible as a prop.

The first is `data-*`. React's typings do not model it on a component's props, so `attributes` takes an open map:

```tsx
<JLink node={page} attributes={{ "data-element-type": "cta" }} />
```

A static map is the easy half. The interesting form is a function, because the values an analytics layer wants are the ones the component just computed and would otherwise keep to itself — the resolved URL and the derived label:

```tsx
<JLink
  content={cta}
  attributes={({ anchor, state }) => ({
    "data-element-url": anchor.href,
    "data-element-text": state.label,
    "data-element-current": state.isCurrent,
  })}
/>
```

It receives exactly what `getLinkProps` returns, so the same callback works on both tiers. It is spread last, so it wins over anything else on the element, and it is not called at all when the link is not navigable. `<JImage attributes>` is the same shape, for the same reason.

The second is a wrapper that is not a bare `<a>`. A design system's call to action is usually its own component, and wrapping it in an anchor gives you two nested interactive elements. `asChild` hands the link to the element you render instead — Next.js calls the same thing `passHref`:

```tsx
<JLink node={page} asChild>
  <CTA variant="primary">Read more</CTA>
</JLink>
// → <a href="…" class="cta cta--primary">Read more</a>
```

The child receives `href`, `target`, `rel`, `aria-current` and whatever `attributes` produced, and must forward them to the element it renders. It needs exactly one element child; anything else is an error naming the way out. When the link is not navigable the child is still rendered, simply without the link — `whenUnresolved="none"` is how you drop it entirely.

## A target that does not resolve is normal

This is the part that surprises people. Publishing a page does **not** publish the pages it links to: `jnt:page` is in `referencedNodeTypesToSkip`. So a perfectly ordinary editorial workflow — build a card, point it at a page that is still a draft, publish the card — leaves you with a reference that resolves to nothing in live.

Before `<JLink>`, that case ended the render of the whole fragment:

```tsx
// Don't: buildNodeUrl throws when the node is undefined, and the section disappears
<a href={buildNodeUrl(props["j:linknode"])}>{title}</a>
```

The visitor gets HTTP 200 with the section replaced by an HTML comment. Unpublished, deleted and "you are not allowed to see it" all arrive as the same falsy value at the JCR boundary, so no component can tell them apart.

`<JLink>` treats it as a result rather than an error. It never throws, and it never renders an `<a>` without an `href`. When the link is not navigable it renders the children on their own; pass `whenUnresolved="none"` to render nothing at all:

```tsx
<JLink node={maybeMissing}>{title}</JLink>
// → <a href="…">Title</a> or just Title

<JLink node={maybeMissing} whenUnresolved="none">
  {title}
</JLink>
// → <a href="…">Title</a> or nothing
```

The same applies to a rejected URL and to a target that is missing in the language you asked for.

If you need to know which case you are in — to render a different fallback, for instance — use the props tier directly:

```tsx
import { getLinkProps, useServerContext } from "@jahia/javascript-modules-library";

const { anchor, state } = getLinkProps(node, {}, useServerContext());
return state.navigable ? <a {...anchor}>{state.label}</a> : <span>{state.label}</span>;
```

`anchor` is spreadable onto an `<a>` — every key is a valid anchor attribute, by construction. `state` is not: `navigable`, `isCurrent`, `isAncestor`, `label` and `node` are yours to read, never to spread.

`state.node` is what the link resolved to — the node target, or the reference read off a content node. It saves the second resolution a fallback usually needs:

```tsx
const { anchor, state } = resolveContentLink(cta, {}, useServerContext()) ?? {};
const label = state?.label || state?.node?.getProperty("acme:shortName")?.getString();
```

Reading a reference yourself is the other half of that problem, and it is a JCR concern rather than a link one: an unresolvable reference reaches JavaScript as a plain falsy value, so every view that touches a `weakreference` ends up writing the same try/catch. `readNodeReference` is that try/catch, once, next to `getNodeProps`:

```tsx
import { readNodeReference } from "@jahia/javascript-modules-library";

const related = readNodeReference(currentNode, "acme:related");
// null            → the property is unset
// { uuid }        → it is set, and the target is not reachable (unpublished, deleted, forbidden)
// { uuid, node }  → it resolved
```

It never throws. What it cannot tell you is _why_ an unreachable target is unreachable: unpublished, deleted and "you may not see it" arrive identically, and no JCR read separates them.

:::info
`getLinkProps` reads no React context of its own. Inside a view, pass `useServerContext()`. Without it you still get an `href`, but no cache dependency is registered and `isCurrent` is always false — a silent downgrade, not an error.
:::

## Reading a link off a content node

Editors rarely fill in a single reference. They pick a link _type_ and then fill in either an internal reference or an external URL. Core has `jnt:nodeLink` (`j:node`) and `jnt:externalLink` (`j:url`); the Jahia/default module adds the `j:linkType` convention with `jmix:internalLink` (`j:linknode`) and `jmix:externalLink` (`j:url`, `j:linkTitle`).

Pass the content node and let the library read it:

```tsx
<JLink content={currentNode} className={classes.cta} />
```

With no children, the label comes from the content: `jcr:title`, then `j:linkTitle`, then the displayable name of the target.

### When the link is a mixin, the label is somewhere else

That default is right when the link **is** the content — a `jnt:nodeLink` exists to be a link, and its `jcr:title` is the link label. It is wrong as soon as the link is a **mixin on something else**. A CTA mixin sits on a card, a panel or a hero that already has a `jcr:title`, and that title is the heading. Take it as the label and every call to action on the page is named after the section it lives in.

Say where the label really lives:

```tsx
// The mixin stores its own label
<JLink content={card} labelProperties={["acme:ctaLabel"]} />

// There is no label property: use the name of the page it points at
<JLink content={card} labelFrom="target" />
```

`labelProperties` replaces the list that is tried on the content node, in order. `labelFrom="target"` skips the content node altogether — the readable spelling of `labelProperties={[]}` — and takes precedence over `labelProperties` when both are given. An explicit `label`, or children, still wins over either.

Because the `j:linkType` convention is a module convention and at least four spellings of it exist in the wild, the discriminator is a parameter:

```tsx
<JLink content={currentNode} typeProperty="ctaType" noneValue="noLink" />
```

Only the "no link" value of the discriminator is read — every vocabulary agrees on having one, while their other values are incompatible. Which link to render is decided by which property is filled: the reference properties first, then the URL.

:::warning
That precedence has a consequence. An editor who first picks "internal", chooses a page, then switches to "external" and types a URL may leave the reference property behind, and the reference wins. When you know the shape of your own content type, say so:

<!-- prettier-ignore -->
```tsx
// This CTA is external: ignore any reference an earlier edit left behind
<JLink content={cta} referenceProperties={[]} urlProperty="cta:href" />
```

:::

## URLs you did not build

Any string that the library did not build itself goes through a scheme allow-list: `http`, `https`, `mailto`, `tel` and `ftp`. Anything else — `javascript:`, `data:`, `blob:`, `vbscript:` — is not navigable. Site-relative paths (`/search`) and same-document fragments (`#main`) pass, but a protocol-relative `//host` does not: it leaves the site, so it has to name a scheme.

This applies to an `href` you pass and to an author-supplied `j:url` alike, and it is applied at render time, so it also covers content stored before anyone thought to validate it. React alone is not enough here: it neutralises `javascript:` by substituting a throwing URL, and it matches no other scheme.

A project is often stricter than that. A "partner website" field that must be `https://` and nothing else does not want `tel:` links quietly working. Narrow the list — per call, or once for the whole module:

```ts
// src/server/links.ts, imported once from a view
import { setLinkDefaults } from "@jahia/javascript-modules-library";

setLinkDefaults({ allowedSchemes: ["http", "https"] });
```

```tsx
<JLink content={partner} allowedSchemes={["https"]} />
```

`setLinkDefaults` is keyed by the module that calls it, the same way `setImageDefaults` is: every JavaScript module in an instance shares one JavaScript context, so a module-level variable would be a policy for the whole server. Call it at the top level of a server file, not inside a render.

:::warning
The option **narrows only**. A scheme that is not on the built-in list is dropped rather than added, because a call site is not the place a project loosens its own URL policy — `javascript:` and `data:` are the reason the list exists. On a development instance the library says so once per scheme; in production the links are simply not navigable.
:::

Query parameters and a fragment are options rather than string surgery, and they land in the right order:

```tsx
<JLink node={page} parameters={{ q: "jahia" }} hash="results" />
// → /sites/example/search.html?q=jahia#results
```

## Cache dependencies

A rendered fragment is cached. If it contains a link to a page whose title just changed, the fragment has to be flushed — otherwise the visitor keeps the old label. `<JLink>` registers that dependency for you, on the node it resolved to.

You only touch this when the automatic choice is wrong. Pass a key form explicitly:

| Form                                                | When                                                                         |
| --------------------------------------------------- | ---------------------------------------------------------------------------- |
| `{ node }`                                          | The default when the target resolved.                                        |
| `{ path: "/sites/x/home" }`                         | You are looping over JCR query hits, which give you paths rather than nodes. |
| `{ flushOnPathMatchingRegexp: "/sites/x/news/.*" }` | The fragment depends on a whole subtree.                                     |

```tsx
<JLink href={url} cacheDependency={{ path }} />
<JLink node={page} cacheDependency={false} />
```

There is a fourth form, `{ uuid }`, which the library picks by itself when a reference does not resolve — the fallback fragment has no node to depend on, only the raw reference. It is meant to flush that fragment once the target is finally published.

:::warning
The engine drops the `{ uuid }` form today: the tag it feeds resolves the UUID against a page context it has not been given yet, and the failure is swallowed ([issue #750](https://github.com/Jahia/javascript-modules/issues/750)). The other three forms work. Until that is fixed, a fragment that fell back is flushed by whatever else it depends on, or by a `flushOnPathMatchingRegexp` on the section the target will land in.
:::

## Current-page state, and the property you must declare

`<JLink>` emits `aria-current="page"` when the target is the page being rendered, and `state.isCurrent` / `state.isAncestor` are there for styling a navigation:

```tsx
const { state } = getLinkProps(page, {}, useServerContext());
<JLink node={page} className={state.isAncestor ? classes.open : undefined} />;
```

Nodes are compared by identifier, never by identity: two `JCRNodeWrapper` proxies for the same node are not the same object, so `page === mainNode` is a bug even where it appears to work.

:::warning
A view that reads `isCurrent` or `isAncestor` — or that simply lets `<JLink>` emit `aria-current` — **must** declare `cache.mainResource=true`:

```tsx
jahiaComponent(
  {
    componentType: "view",
    nodeType: "example:navBar",
    // Without this, the fragment is cached once and replayed on every page
    properties: { "cache.mainResource": "true" },
  },
  () => <nav>{/* … */}</nav>,
);
```

The fragment cache key does not include the main resource unless the view opts in. Without it, a shared fragment — a navigation in an `AbsoluteArea`, for instance — is rendered once, with `aria-current` on whichever page happened to be rendered first, and replayed on every other page.
:::

A language switcher is the case where the computation is wrong and you know better: every entry points at the same page, so mark them all current with `isCurrent`.

```tsx
<JLink node={page} language={code} isCurrent />
```

`language` also selects the language the URL points at. By default a target that has no translation in that language is not navigable; `requireTranslation={false}` links to it anyway. Both `fr_CH` and `fr-CH` are understood, and language-neutral content — a file, a folder — ignores the option entirely.

## `target` and `rel`

`target` is validated against the four values `jmix:link` allows (`_blank`, `_parent`, `_self`, `_top`). Anything else omits the attribute rather than emitting `target=""`, which matters because the value often comes straight from content. `rel="noopener noreferrer"` is added whenever `target` resolves to `_blank`; pass `rel` yourself to replace it.

:::info
These are live and preview guarantees. In the page builder, `EditModeFilter` rewrites the anchors it delivers: it either deletes `target` or staples `target="_blank"` on with no `rel`. Assert on the delivered DOM, not on what your component returned.
:::

## `href` is a server-side intermediate

The `href` you get back is not the URL the visitor receives. Core finishes it after the render, and it does so by walking the emitted HTML rather than by touching the value you built. Two filters do the work, and each visits a fixed set of tag/attribute pairs in an `html` template type:

| Filter           | What it adds                                                                          | Where it looks                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `URLFilter`      | Vanity URLs, the SEO server name, and the `?jsite=` parameter of a cross-site link    | `a[href]`, `img[src\|srcset\|data-src\|data-srcset]`, `form[action]`, `link[href]`, `source[srcset]`, `embed[src]`, `param[value]` |
| `EditModeFilter` | In the page builder: `/cms/edit/` → `/cms/editframe/`, and `target` deleted or forced | `a[href]` only                                                                                                                     |

So the rule is simple, and it is about **where you put the URL**, not about how you built it:

- Emit it as one of those attributes and it is finished for you.
- Put it anywhere else — a `data-*` attribute of your own, an Island payload, the JSON body of an action, a `<meta>` tag, a JSON-LD block, a CSS `url()` — and it stays exactly as you built it. No vanity URL, no `?jsite=`.
- Never string-compare an `href`, and never parse it to decide something. Compare nodes, or use `state.isCurrent` and `state.isAncestor`.

There is no call that runs the finishing pass for you: it needs the assembled HTML, which does not exist yet while your view runs. What you can do is make the URL correct without it — see below — and reach for `buildNodeUrl(node, { absolute: true })` when the URL leaves the page altogether (`og:url`, an email, JSON-LD).

### The edit-mode URL, which used to need a workaround

One rewrite used to bite hard enough that projects patched it by hand:

```tsx
// Don't. This is what the library now gets right.
buildNodeUrl(target).replace("/cms/edit/", "/cms/editframe/");
```

The reason it existed: `/cms/edit/…` does not render a page. On Jahia 8.2.3 it answers `302` to the jContent UI, and it only ever reached the page because `EditModeFilter` substituted the two — for an `a[href]` and nothing else. A URL in an Island payload kept the redirecting form, so the nav rendered by that Island navigated the iframe to a whole second copy of jContent.

`buildNodeUrl` now emits `/cms/editframe/…` for edit mode directly, which is what `node.getUrl()` already returned when no `mode`, `language` or `extension` was named. The workaround is no longer needed, and neither is the branch around it:

```tsx
// The URL is correct wherever it goes, including into an Island
const { anchor, state } = getLinkProps(page, { language }, useServerContext());
<Island component={Switcher} props={{ anchor, label: state.label }} />;
```

Note that this is the URL of the page **inside** the builder's frame. Deep-linking a visitor into the jContent editor is a different URL (`/jahia/jcontent/…`) and not something this API builds.

## Links inside Islands

The library cannot be imported from a client bundle: the Vite plugin fails the build if you try. An Island therefore receives link _data_, not a link component, and renders the anchor itself:

```tsx
// Server view
const { anchor, state } = getLinkProps(page, {}, useServerContext());
return <Island component={Menu} props={{ anchor, label: state.label }} />;
```

```tsx
// Client component
export default function Menu({ anchor, label }: { anchor: AnchorProps; label: string }) {
  return <a {...anchor}>{label}</a>;
}
```

Server-render the anchor whenever you can. An anchor created on the client after hydration is invisible to `URLTraverser`, and so loses the vanity URL and the cross-site parameter, exactly as above.

## What links in rich text do

Rich text reaches the page through `dangerouslySetInnerHTML`, which is outside a link component's reach. Core does resolve the internal references an editor inserted there, but nothing applies the scheme allow-list, adds `rel` to a `target="_blank"`, or sanitises an author-pasted `javascript:` href.

If you need a policy on those anchors, it belongs in a render filter — `registerRenderFilter` above priority 21, so that it runs on the assembled HTML — not in a component.

## Reference

- [`JLink`](https://github.com/Jahia/javascript-modules/blob/main/javascript-modules-library/README.md#jlink) — the component
- [`getLinkProps`](https://github.com/Jahia/javascript-modules/blob/main/javascript-modules-library/README.md#getlinkprops) — the props tier, for Islands and custom markup
- [`resolveContentLink`](https://github.com/Jahia/javascript-modules/blob/main/javascript-modules-library/README.md#resolvecontentlink) — reading a link off a content node
- [`setLinkDefaults`](https://github.com/Jahia/javascript-modules/blob/main/javascript-modules-library/README.md#setlinkdefaults) — the module-wide scheme allow-list
- [`readNodeReference`](https://github.com/Jahia/javascript-modules/blob/main/javascript-modules-library/README.md#readnodereference) — reading a reference property safely
- [`buildNodeUrl`](https://github.com/Jahia/javascript-modules/blob/main/javascript-modules-library/README.md#buildnodeurl) — the URL tier underneath
