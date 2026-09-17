---
page:
  $path: /sites/academy/home/documentation/jahia/8_2/developer/javascript-module-development/images
  jcr:title: Rendering Images
  j:templateName: documentation
content:
  $subpath: document-area/content
---

Content images come from the JCR, and rendering one well means more than pointing an `<img>` at it: a browser should download a file sized for the slot it will occupy, the space it needs should be reserved before it arrives, editing the image should flush the cached fragments that show it, and a screen reader should be told what it is. The `JImage` component does all of that from one declaration.

## The short version

```tsx
import { JImage, jahiaComponent } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import placeholder from "./placeholder.jpg";

jahiaComponent(
  { nodeType: "example:article", componentType: "view" },
  ({ title, cover }: { title: string; cover?: JCRNodeWrapper }) => (
    <article>
      <h2>{title}</h2>
      <JImage node={cover} alt={title} sizes="auto" fallback={placeholder} className="cover" />
    </article>
  ),
);
```

That renders an `<img>` with a `src` sized for the slot, a `srcSet` of alternatives the browser can pick from, a `sizes` the browser resolves against the real box, the intrinsic dimensions that reserve its space, `loading="lazy"`, and a registered cache dependency on the image node.

Three things are worth knowing before anything else:

- **You describe the slot exactly once.** Either `slotWidth`, when the markup knows the slot's width in CSS pixels, or `sizes`, when only CSS knows it — never both. `sizes="auto"` lets the browser measure the real box, and on a fluid design that is most slots.
- **`alt` is required.** An image that carries no information of its own — a decorative flourish, or one that only repeats an adjacent caption — is declared with `alt=""`. That is a deliberate statement, not a shortcut, and it is why the prop has no default.
- **`fallback`** is a static asset of your module, rendered when the content property is empty. Without one, a missing `node` renders nothing at all rather than a broken image. Roughly a third of real call sites want it.

## Pick the spelling your slot actually has

Two questions, in this order.

**Does anything in the markup know how wide the slot is, in CSS pixels?** If it does, say the number with `slotWidth`. If it does not — the width comes from a `%`, a `fr`, a `rem`, a grid track, a flex line — then the only honest description is a `sizes` string, and you write that instead.

**Is the image in the normal flow, or stretched over a parent that owns the box?** Everything in the normal flow is the default layout; an image positioned over its parent is `layout="fill"`.

A slot is described **once**. `slotWidth` and `sizes` are two descriptions of the same box, and nothing can reconcile them, so writing both is a type error. The candidate files follow whichever one you wrote — that is what picking one is for.

| Your slot                                                              | Write                                                                   |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| a real number of CSS pixels, always — an avatar, a fixed logo slot     | `layout="fixed" slotWidth={80}`                                         |
| the viewport — a hero, a full-bleed banner                             | `layout="full-width"`                                                   |
| a max-width container: at most N pixels, the full viewport below that  | `slotWidth={400}`                                                       |
| a grid cell, or a column that changes at every breakpoint              | `sizes="(min-width: 64rem) 33vw, 100vw"`                                |
| an `aspect-ratio` box — `.card { aspect-ratio: 16 / 9 }`               | `sizes="auto"`, or the string that describes the column the box sits in |
| positioned _over_ a parent that owns the box, cropped under an overlay | `layout="fill" sizes="auto"`                                            |
| height-constrained — `.logo-strip img { height: 3rem; width: auto }`   | `sizes="auto"`, with the caveat [below](#the-height-constrained-slot)   |
| the box is the `width`/`height` attributes, with no CSS at all         | `layout="fixed" slotWidth={48} width={48} height={48}`                  |

```tsx
<JImage node={avatar} alt={fullName} layout="fixed" slotWidth={80} />
<JImage node={hero} alt={title} layout="full-width" preload />
<JImage node={cover} alt={title} slotWidth={400} />
<JImage node={card} alt="" sizes="(min-width: 64rem) 33vw, 100vw" className={classes.card} />
<JImage node={photo} alt="" sizes="auto" className={classes.tile} />
<JImage node={icon} alt="" layout="fixed" slotWidth={48} width={48} height={48} />
```

`slotWidth` is deliberately not called `width`: it is how much room the layout gives the image, in CSS pixels, while `width` is the HTML attribute that ends up in the markup. They are different numbers with different jobs, and the component accepts both — which is why the last row states them both. The attributes reserve the space; they do not describe the slot, because CSS can still resize the element they are on.

### The `aspect-ratio` box

An **`aspect-ratio` box** (`.card { aspect-ratio: 16 / 9 }`) states a height-to-width relation and never a width. Whatever width the layout gives the box, the height follows. So the box is described by the _column_ it sits in: `sizes="(min-width: 64rem) 33vw, 100vw"` if you know that column, and `sizes="auto"` if you do not. Declaring a `slotWidth` your CSS contradicts is worse than declaring none — the browser is then told about a slot that does not exist.

### The height-constrained slot

A **height-constrained slot** (`.logo-strip img { height: 3rem; width: auto }`) states a height, and its width is the height times _that asset's_ aspect ratio. **No framework has a precise answer for this**, ours included: `sizes` is a statement about widths, and the browser resolves it before it knows anything about the file it is going to fetch. Astro converts the height into a width through the aspect ratio and then emits a `sizes` about the viewport's width, which is a different quantity; Next's width computation takes no height at all, and its `fill` layout rejects a caller height other than `100%`.

What to write:

- `sizes="auto"` is the honest answer, and the accurate one. The browser measures the real box after layout, so the height constraint is already applied by the time it picks a file. It only works on a lazily loaded image, which a logo strip below the fold is anyway.
- If the image must load eagerly — it is the LCP element — compute the width yourself, from the CSS height and the asset's own ratio, and state it as a pixel `sizes`:

  ```tsx
  const cssHeight = 48; // .logo-strip img { height: 3rem }
  const { intrinsicWidth = cssHeight, intrinsicHeight = cssHeight } = readImageMeta(logo);
  const slot = Math.round((cssHeight * intrinsicWidth) / intrinsicHeight);

  <JImage node={logo} alt="Acme" sizes={`${slot}px`} preload />;
  ```

  That is exact for the one asset, and it is why the library will not do it for you: it is your CSS height, not something the markup states.

## What actually resizes the image, and where

This is the part that surprises people, and it is worth knowing before you go looking for a bug: **a plain Jahia instance does not resize images on request.** The size travels differently depending on where the asset lives, and `buildImageUrl` reports which channel it used.

| Channel     | When                                                                                 | Resizes?                                                                                                                                                                                                                                                           |
| ----------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `loader`    | the call, or the module, supplies a `loader`                                         | Up to that loader — the library stops guessing                                                                                                                                                                                                                     |
| `provider`  | the asset is mounted from an external provider (a DAM such as Keepeek or Cloudinary) | Yes — the provider's decorator builds a signed, transformed URL                                                                                                                                                                                                    |
| `thumbnail` | the requested width matches a thumbnail Jahia pre-generated (150px, 350px)           | Yes, and this is the only one that works with no extra infrastructure                                                                                                                                                                                              |
| `query`     | anything else on the default provider: the size becomes `?w=` / `?h=`                | Only behind [Media Optimization](https://academy.jahia.com/documentation/jahia-cms/jahia-8-2/developer/optional-features/media-optimization-cloudimage) (Jahia Cloud, live mode). Elsewhere the file servlet ignores the parameters and returns the original bytes |
| `original`  | vectors, `unoptimized`, and any request that matches the original size               | Nothing to do                                                                                                                                                                                                                                                      |

So on your local instance, a `srcSet` full of `?w=` candidates is expected, and every one of them returns the same file. Nothing is broken: the markup is correct, and it starts saving bytes the moment the site runs somewhere that honours the hint. If you want to see real per-width files locally, mount a DAM, request a thumbnail width, or write a [loader](#your-own-url-dialect-loader).

An instance in development mode says so rather than letting you discover it: the first image that falls back to `?w=` candidates prints one warning naming that image as its example and pointing back at this section. It says the same thing for every image, so it is printed once per instance and never in production.

### When Jahia never measured the image

Everything the library derives from the intrinsic size — capping candidates at the original, the `width`/`height` pair that reserves the space, and the `loading="lazy"` that pair makes safe — comes from two JCR properties, **`j:width` and `j:height`**. Jahia's image extractor writes them when the file is uploaded, and an asset that arrived another way (an import, a provider mount, an extractor that failed) can carry neither.

Nothing about the resulting markup is invalid, which is why nobody notices. A development instance prints one warning per such image, naming it. The fix is on the content side — re-upload the file, or run the extractor over it — and until then you can state the box yourself with `width` and `height`.

## Two different widths: the slot and the file

The number in `slotWidth` is the **slot**: how much room the image gets in the layout, in CSS pixels. The numbers in `srcSet` are **files**: how many actual pixels each candidate contains. They are not the same thing, and that is the whole reason `srcSet` exists.

A slot of 400 CSS pixels needs a 400-pixel file on an ordinary screen and an 800-pixel one on a phone with a 2× display. A slot that says "up to 400, less on a narrow screen" needs smaller files too. So one slot maps to _several_ useful file sizes, and the browser is the only party that knows which one to fetch — it is the only one that knows the viewport and the pixel density at the moment the page loads.

The **candidate ladder** is the list of file widths offered for the layouts where the slot is not a single number:

| Layout                      | Files offered                                                         | Uses the ladder                                               |
| --------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------- |
| `fixed` + `slotWidth`       | `slotWidth`, `2 × slotWidth`                                          | no — the slot is one number, so two files cover it            |
| `constrained` + `slotWidth` | ladder entries up to `2 × slotWidth`, then `slotWidth` and its double | yes, for the narrow viewports where the image shrinks         |
| `full-width`                | the whole ladder                                                      | yes — the slot is the viewport, which varies from phone to 4K |
| any layout + `sizes`        | the ladder entries the `sizes` string asks for                        | yes — the string is the only description, so it decides       |

The default ladder is `[320, 640, 960, 1280, 1920, 2560]` — doubling-ish steps, because a candidate only pays for itself if it is meaningfully smaller than the next one up. Override it per call with `breakpoints`, or once for the whole module with [`setImageDefaults`](#module-wide-defaults).

Two consequences worth knowing. Candidates stop at `2 × slotWidth`: a 3× file costs roughly twice the bytes of a 2× one for a difference few people can see, so a 3× phone gets the 2× file. And the ladder starts at 320: below that, a device asks for the 320-pixel file and scales it down, which is the right trade for the handful of viewports that narrow.

### When the ladder comes from your `sizes`

A `sizes` string is a description of the slot, so the candidates are derived from it and not from anything else. Each entry's source size is read — its media condition is skipped, so the `1024px` in `(min-width: 1024px) 33vw` is never mistaken for a slot width — and the two ends of the ladder stand in for the two ends of the viewport range. The narrowest slot the string can describe becomes the floor, the widest becomes the ceiling, and the ladder keeps every entry from the floor up to and including the first one that reaches **twice** the ceiling, so the widest slot is still sharp on a 2× display.

`vw`, `px`, decimals and the `calc()` / `min()` / `max()` / `clamp()` functions are all read. Anything the parser cannot read — `auto`, a `%`, an `em`, a malformed string — falls back to **the whole ladder**, never to a narrow one: a ladder that is too wide costs a few bytes of markup, where one that is too narrow ships images the browser has to upscale, and says nothing about it.

Candidates are always capped by the original — Jahia never upscales — and the original itself is only offered when it is close to the largest size actually requested, so an 8000-pixel master is never sent to fill a 640-pixel card.

`widths` (candidate widths, in **image** pixels) overrides the ladder when you know better. It replaces the ladder, not the slot: the slot still has to be described, because that is what `sizes` is built from.

### Why two attributes at all

`srcSet` lists files with their widths (`photo.jpg?w=640 640w`). `sizes` tells the browser how much space the image will occupy (`(min-width: 400px) 400px, 100vw`, or `auto` to measure it). The browser divides one by the other, multiplies by the screen's device pixel ratio, and downloads the smallest file that still looks sharp. Get `sizes` wrong — or omit it — and the browser assumes the image fills the viewport and downloads far more than it needs. That is the arithmetic `layout` exists to do for you.

### `sizes="auto"`

`sizes="auto"` asks the browser to measure the real box after layout, which beats any value you could derive from the markup. It is the usual answer whenever only CSS knows the slot, and one thing follows from the specification: **`auto` is only read on a lazily loaded image**, so `<JImage>` sets `loading="lazy"` for you. Since nothing in the string describes the slot, the candidates are the whole ladder.

That makes `auto` and `preload` contradictory. They still meet in practice, because they come from different layers — a shared wrapper defaults every image to `sizes="auto"`, a leaf view marks this one as the page's LCP element — and neither layer can see the other. The eager load wins, `auto` becomes `100vw`, and a development instance prints one warning naming the image. `100vw` is the safe, wasteful answer and the only one left: a slot spelled with `sizes` carries no width to derive a better one from. To get a better value, describe the slot yourself: `sizes="(min-width: 60rem) 33vw, 100vw"`.

## The `fill` layout: an image positioned over its parent

`fill` is not the ordinary in-flow case. It takes the image **out of the normal flow** and stretches it over the nearest positioned ancestor, which is what you want when the parent owns the box and the image is decoration inside it: a card cover under a text overlay, a banner cropped with `object-fit`.

It is the one layout that carries CSS of its own, and it only works if the parent cooperates:

```tsx
<div className={classes.frame}>
  <JImage node={cover} alt="" layout="fill" sizes="auto" className={classes.cover} />
  <h3 className={classes.title}>{title}</h3>
</div>
```

```css
/* The parent must be positioned, and must have a height of its own — the image no longer
   contributes one, because it is absolutely positioned. */
.frame {
  position: relative;
  aspect-ratio: 16 / 9;
}

.cover {
  object-fit: cover;
}
```

Two consequences. Since nothing in the document says how wide that parent is, `sizes` is required. And the intrinsic `width`/`height` are deliberately not emitted: they would state a box that fights the parent's. Your own `style` still wins over the positioning the component applies.

If the parent has no reason to be positioned, drop `layout="fill"` and keep the `sizes`: an ordinary image in the normal flow, described the same way.

## Above the fold: `preload`

An image is lazy-loaded by default, which is wrong for the one image that is already on screen when the page opens — usually the largest, and the one the browser measures as [Largest Contentful Paint](https://web.dev/articles/lcp).

```tsx
<JImage node={hero} alt={title} layout="full-width" preload />
```

`preload` loads it eagerly and at high fetch priority. Use it on one image per page. It overrides `sizes="auto"`, for the reason given [above](#sizesauto).

## Every `<img>` attribute still reaches the element

`JImage` accepts everything an `<img>` accepts, minus the two attributes it computes (`src` and `srcSet`). `className`, `style`, `id`, `decoding`, `referrerPolicy`, `crossOrigin`, `usemap`, every `aria-*` — they are passed straight through, and the list is derived from the component's own props, so a prop added later cannot silently swallow one.

`width` and `height` are the HTML attributes. Write them and they win over the intrinsic dimensions, which is how an image takes its box from the markup and needs no CSS rule at all:

```tsx
<JImage node={icon} alt="" layout="fixed" slotWidth={48} width={48} height={48} />
```

**They are required together.** Two of them state one box, and half of yours with half of ours would state a wrong aspect ratio — so the component takes both or neither, and TypeScript says so at the call site. This is also the guard against the easiest mistake in this API: writing `width={400}` when you meant `slotWidth={400}`.

For anything React's typings do not model — `data-*` above all — there is `attributes`, spread onto the element last. It takes a record, or a function of the image the library resolved:

```tsx
<JImage node={cover} alt={title} slotWidth={400} attributes={{ "data-testid": "cover" }} />
<JImage
  node={cover}
  alt={title}
  slotWidth={400}
  attributes={({ src, width }) => ({ "data-track-src": src, "data-track-width": width })}
/>
```

## Alternative text

`alt` is not optional, because a missing one is invisible until someone using a screen reader hits it. Describe what the image shows, in the page's language:

```tsx
<JImage node={photo} alt={t("alt.estate", { estate: title })} slotWidth={400} />
```

## A placeholder while it loads

`placeholder="blur"` paints the smallest thumbnail Jahia pre-generated under the image, as a `background-image`, so a large photo shows something immediately instead of a blank box. The browser scaling a 150-pixel file up is what produces the blur.

```tsx
<JImage node={hero} alt={title} layout="full-width" preload placeholder="blur" />
<JImage node={hero} alt={title} layout="full-width" blurDataURL={lqip} placeholder="blur" />
```

Two limits worth knowing. The placeholder is **not removed once the image has loaded** — the component renders on the server and there is no client-side code to clear it — so it stays behind a transparent PNG. And an image Jahia has generated no thumbnail for simply gets no placeholder, rather than an error.

`placeholder` covers the loading gap; `fallback` covers the missing node. They are different problems and can be used together.

## Your own URL dialect: `loader`

A project on a CDN, a custom DAM, or a Media Optimization setup that speaks a different dialect replaces the routing entirely. A loader is given the asset's own URL, the candidate width and the requested quality, and returns the URL to use:

```tsx
const cloudinary = ({ src, width, quality }) =>
  `https://res.cloudinary.com/acme/image/fetch/f_auto,q_${quality ?? "auto"},w_${width}/${src}`;

<JImage node={cover} alt={title} slotWidth={400} loader={cloudinary} quality={80} />;
```

`quality` is passed to the loader. Without one it rides the channel that already carries hints — `?q=` on `query`, one more decorator argument on `provider` — and is dropped on `thumbnail` and `original`, which are fixed renditions with nothing to act on.

`unoptimized` opts a single image out of all of it: the original bytes, no candidates, no `srcSet`.

### Module-wide defaults

Setting the loader on every call site is how it drifts. `setImageDefaults` sets it once for the module, at the top level of a server file:

```tsx
import { setImageDefaults } from "@jahia/javascript-modules-library";

setImageDefaults({ loader: cloudinary, quality: 80, breakpoints: [480, 960, 1440] });
```

Any single call can still override any of them. The defaults belong to **your** module: every JavaScript module in an instance shares one JavaScript context, and these are keyed so that yours never reaches anybody else's images.

## Images inside an island

An island's props are serialized, so a React element cannot be one of them, and its server-rendered children are frozen — a client component cannot re-render them. A gallery that swaps images on click therefore needs image **data**, which is exactly what `getImageProps` returns:

```tsx
// gallery.server.tsx
import { getImageProps, Island, useServerContext } from "@jahia/javascript-modules-library";

function GalleryView({ photos, title }) {
  const context = useServerContext();
  const images = photos.map((photo) =>
    getImageProps(photo, { alt: title, slotWidth: 800 }, context),
  );

  return <Island component={Gallery} props={{ images }} />;
}
```

```tsx
// Gallery.client.tsx
import type { ImgProps } from "@jahia/javascript-modules-library";

export default function Gallery({ images }: { images: ImgProps[] }) {
  const [current, setCurrent] = useState(0);
  return <img {...images[current]} onClick={() => setCurrent((i) => i + 1)} />;
}
```

The `context` is not optional: it carries the render cache dependency and it names the module whose `setImageDefaults` apply, so a call without it silently loses both. Inside a view it comes from `useServerContext()`.

`ImgProps` is plain, serializable data — the type of what comes _out_ of `getImageProps`, as opposed to `JImageProps`, the component's own props. `alt` is required there too. It carries `loading: "lazy"` when `sizes` resolved to `auto`; spread the whole object rather than picking fields out of it, or that pairing is lost.

`getImageProps` accepts a missing node, like the component does: with a `fallback` it returns the fallback's props, and without one it returns `null`.

## Background images

CSS needs a `url()` value, not an `<img>`. `buildBackgroundImageUrl` returns one, with the same routing, the same clamping, the same cache dependency, and the escaping a stylesheet needs:

```tsx
<div style={{ backgroundImage: buildBackgroundImageUrl(node, { width: 1920 }) }} />
```

A background has no `srcSet`, so ask for the largest size the slot can reach and let the clamp cut it down. Density is `image-set()`, and that one is yours to write.

## Absolute URLs

`og:image`, `og:url`, a canonical link and JSON-LD all need a URL with a scheme and a host. `absolute` produces one, on `buildNodeUrl` and on every image function:

```tsx
buildNodeUrl(page, { absolute: true });
buildImageUrl(cover, { width: 1200 }, { absolute: true }).url;
getImageProps(cover, { alt: title, sizes: "auto", absolute: true }, context);
```

The host is the **target site's** server name, not the current request's — a link to a page of another site must name that site's server. A site with no server name configured falls back to the request's own scheme, host and port, which is what makes this work on a local instance. When neither is right — a reverse proxy, a preview host, a canonical domain — name the origin yourself: `absolute: "https://www.example.com"`.

## Cache dependencies

`JImage`, `getImageProps`, `buildImageUrl` and `buildBackgroundImageUrl` all register a render cache dependency on the image node, so replacing the image in jContent flushes the fragments that display it. Pass `cacheDependency: false` only when you register it yourself:

```tsx
server.render.addCacheDependency({ node: imageNode }, renderContext);
```

## Reference

- `JImage` — the component. Renders an unstyled `<img>`, except where the feature is styling (`fill`, `placeholder`). Server-side only.
- `getImageProps(node, options, context)` — the same props as plain data, for islands and for cases where you own the element.
- `buildImageUrl(node, size, options)` — one URL and the channel that carried the size.
- `buildBackgroundImageUrl(node, size, options)` — a CSS `url("…")` value.
- `buildThumbnailUrl(node)` — the smallest thumbnail Jahia pre-generated, or `undefined`.
- `inspectImageChannel(node, width, options)` — which channel a given width would take.
- `setImageDefaults({ loader, quality, unoptimized, breakpoints })` — the module's defaults.
- `readImageMeta(node)` — mime type and intrinsic dimensions, if you need them directly (`og:image:width`, for instance).
