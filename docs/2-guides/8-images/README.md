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

jahiaComponent(
  { nodeType: "example:article", componentType: "view" },
  ({ title, cover }: { title: string; cover?: JCRNodeWrapper }) => (
    <article>
      <h2>{title}</h2>
      <JImage node={cover} alt={title} layout="fill" sizes="auto" className="cover" />
    </article>
  ),
);
```

That renders an `<img>` with a `src` sized for the slot, a `srcSet` of alternatives the browser can pick from, a `sizes` the browser resolves against the real box, `loading="lazy"`, and a registered cache dependency on the image node. `fill` stretches the image over `.cover`'s nearest positioned ancestor, so give that element a `position: relative` and a height.

## Pick the layout your slot actually has

The first question is not how wide the image is. It is **whether anything in your markup knows how wide it is.**

| Your slot                                                                                       | Layout                     | You also provide           |
| ----------------------------------------------------------------------------------------------- | -------------------------- | -------------------------- |
| sized by CSS you cannot read from the view — `%`, `fr`, `rem`, a grid cell, an aspect-ratio box | `fill`                     | `sizes` (usually `"auto"`) |
| spans the viewport — a hero, a full-bleed banner                                                | `full-width`               | nothing                    |
| a real number of CSS pixels, always — an avatar, a fixed logo slot                              | `fixed`                    | `slotWidth`                |
| at most a number of CSS pixels, shrinking on a narrow viewport                                  | `constrained` (default)    | `slotWidth`                |
| the box comes from the `width`/`height` attributes, with no CSS at all                          | any, with `width`+`height` | `width`, `height`          |

On a fluid design, most slots are the first row. `fill` is the ordinary case, not an escape hatch:

```tsx
<JImage node={card} alt="" layout="fill" sizes="auto" className={classes.card} />
<JImage node={hero} alt={title} layout="full-width" preload />
<JImage node={avatar} alt={fullName} layout="fixed" slotWidth={80} />
<JImage node={cover} alt={title} slotWidth={400} />
<JImage node={icon} alt="" width={48} height={48} />
```

`slotWidth` is deliberately not called `width`: it is how much room the layout gives the image, in CSS pixels, while `width` is the HTML attribute that ends up in the markup. They are different numbers with different jobs, and the component accepts both.

### `fill` and `sizes`

`fill` stretches the image over its **closest positioned ancestor** — give that parent `position: relative` (and a height, or an `aspect-ratio`). It is the one layout that carries CSS of its own, because "fills its parent" is not something markup can say; your own `style` still wins over it.

Since nothing in the document says how wide that parent is, `sizes` is required. `sizes="auto"` is usually the right answer: the browser measures the real box after layout, which beats any value you could derive. Two things follow from the specification:

- **`auto` only works on a lazily loaded image**, so `<JImage>` sets `loading="lazy"` for you.
- **`auto` and `preload` are contradictory.** Combining them throws, rather than letting the browser quietly fall back to `100vw` and download the largest candidate on every screen. For an above-the-fold `fill` image, describe the slot instead: `sizes="(min-width: 60rem) 33vw, 100vw"`.

### Two different widths: the slot and the file

The number in `slotWidth` is the **slot**: how much room the image gets in the layout, in CSS pixels. The numbers in `srcSet` are **files**: how many actual pixels each candidate contains. They are not the same thing, and that is the whole reason `srcSet` exists.

A slot of 400 CSS pixels needs a 400-pixel file on an ordinary screen and an 800-pixel one on a phone with a 2× display. A slot that says "up to 400, less on a narrow screen" needs smaller files too. So one slot maps to _several_ useful file sizes, and the browser is the only party that knows which one to fetch — it is the only one that knows the viewport and the pixel density at the moment the page loads.

The **candidate ladder** is the list of file widths offered for the layouts where the slot is not a single number:

| Layout        | Files offered                                                     | Uses the ladder                                               |
| ------------- | ----------------------------------------------------------------- | ------------------------------------------------------------- |
| `fixed`       | `slotWidth`, `2 × slotWidth`                                      | no — the slot is one number, so two files cover it            |
| `constrained` | ladder entries below `slotWidth`, then `slotWidth` and its double | yes, for the narrow viewports where the image shrinks         |
| `full-width`  | the whole ladder                                                  | yes — the slot is the viewport, which varies from phone to 4K |
| `fill`        | the whole ladder                                                  | yes — the slot is unknown at build time, so offer everything  |

The default ladder is `[320, 640, 960, 1280, 1920, 2560]` — doubling-ish steps, because a candidate only pays for itself if it is meaningfully smaller than the next one up. Override it per call with `breakpoints`, or once for the whole module with [`setImageDefaults`](#module-wide-defaults).

Two consequences worth knowing. Candidates stop at `2 × slotWidth`: a 3× file costs roughly twice the bytes of a 2× one for a difference few people can see, so a 3× phone gets the 2× file. And the ladder starts at 320: below that, a device asks for the 320-pixel file and scales it down, which is the right trade for the handful of viewports that narrow.

Candidates are always capped by the original — Jahia never upscales — and the original itself is only offered when it is close to the largest size actually requested, so an 8000-pixel master is never sent to fill a 640-pixel card.

`widths` (candidate widths, in **image** pixels) overrides the ladder when you know better.

### Why two attributes at all

`srcSet` lists files with their widths (`photo.jpg?w=640 640w`). `sizes` tells the browser how much space the image will occupy (`(min-width: 400px) 400px, 100vw`, or `auto` to measure it). The browser divides one by the other, multiplies by the screen's device pixel ratio, and downloads the smallest file that still looks sharp. Get `sizes` wrong — or omit it — and the browser assumes the image fills the viewport and downloads far more than it needs. That is the arithmetic `layout` exists to do for you.

## Above the fold: `preload`

An image is lazy-loaded by default, which is wrong for the one image that is already on screen when the page opens — usually the largest, and the one the browser measures as [Largest Contentful Paint](https://web.dev/articles/lcp).

```tsx
<JImage node={hero} alt={title} layout="full-width" preload />
```

`preload` loads it eagerly and at high fetch priority. Use it on one image per page.

## Every `<img>` attribute still reaches the element

`JImage` accepts everything an `<img>` accepts, minus the two attributes it computes (`src` and `srcSet`). `className`, `style`, `id`, `decoding`, `referrerPolicy`, `crossOrigin`, `usemap`, every `aria-*` — they are passed straight through, and the list is derived from the component's own props, so a prop added later cannot silently swallow one.

`width` and `height` are the HTML attributes. Write them and they win over the intrinsic dimensions, which is how an image takes its box from the markup and needs no CSS rule at all:

```tsx
<JImage node={icon} alt="" width={48} height={48} />
```

They come as a pair: as soon as you write one, the library stops emitting the other from the image's intrinsic size, because half of yours and half of ours would state a wrong aspect ratio.

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

## Alternative text is required

`alt` is not optional, because a missing one is invisible until someone using a screen reader hits it. Describe what the image shows, in the page's language:

```tsx
<JImage node={photo} alt={t("alt.estate", { estate: title })} slotWidth={400} />
```

An image that carries no information of its own — a decorative flourish, or one that only repeats an adjacent caption — is declared with `alt=""`. That is a deliberate statement, not a shortcut.

## A placeholder while it loads

`placeholder="blur"` paints the smallest thumbnail Jahia pre-generated under the image, as a `background-image`, so a large photo shows something immediately instead of a blank box. The browser scaling a 150-pixel file up is what produces the blur.

```tsx
<JImage node={hero} alt={title} layout="full-width" preload placeholder="blur" />
<JImage node={hero} alt={title} layout="full-width" blurDataURL={lqip} placeholder="blur" />
```

Two limits worth knowing. The placeholder is **not removed once the image has loaded** — the component renders on the server and there is no client-side code to clear it — so it stays behind a transparent PNG. And an image Jahia has generated no thumbnail for simply gets no placeholder, rather than an error.

## What actually resizes the image, and where

This is the part that surprises people: **a plain Jahia instance does not resize images on request.** The size travels differently depending on where the asset lives, and `buildImageUrl` reports which channel it used.

| Channel     | When                                                                                 | Resizes?                                                                                                                                                                                                                                                           |
| ----------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `loader`    | the call, or the module, supplies a `loader`                                         | Up to that loader — the library stops guessing                                                                                                                                                                                                                     |
| `provider`  | the asset is mounted from an external provider (a DAM such as Keepeek or Cloudinary) | Yes — the provider's decorator builds a signed, transformed URL                                                                                                                                                                                                    |
| `thumbnail` | the requested width matches a thumbnail Jahia pre-generated (150px, 350px)           | Yes, and this is the only one that works with no extra infrastructure                                                                                                                                                                                              |
| `query`     | anything else on the default provider: the size becomes `?w=` / `?h=`                | Only behind [Media Optimization](https://academy.jahia.com/documentation/jahia-cms/jahia-8-2/developer/optional-features/media-optimization-cloudimage) (Jahia Cloud, live mode). Elsewhere the file servlet ignores the parameters and returns the original bytes |
| `original`  | vectors, `unoptimized`, and any request that matches the original size               | Nothing to do                                                                                                                                                                                                                                                      |

So on your local instance, a `srcSet` full of `?w=` candidates is expected, and every one of them returns the same file. Nothing is broken: the markup is correct, and it starts saving bytes the moment the site runs somewhere that honours the hint. If you want to see real per-width files locally, mount a DAM, request a thumbnail width, or write a loader.

An instance in development mode says so rather than letting you discover it: the first image that falls back to `?w=` candidates prints one warning naming that image as its example and pointing back at this section. It says the same thing for every image, so it is printed once per instance and never in production.

### Your own URL dialect: `loader`

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
import { getImageProps, Island } from "@jahia/javascript-modules-library";

const images = photos.map((photo) => getImageProps(photo, { alt: title, slotWidth: 800 }));

<Island component={Gallery} props={{ images }} />;
```

```tsx
// Gallery.client.tsx
import type { ImageProps } from "@jahia/javascript-modules-library";

export default function Gallery({ images }: { images: ImageProps[] }) {
  const [current, setCurrent] = useState(0);
  return <img {...images[current]} onClick={() => setCurrent((i) => i + 1)} />;
}
```

`ImageProps` is plain, serializable data, and `alt` is required there too. It carries `loading: "lazy"` when `sizes` resolved to `auto`; spread the whole object rather than picking fields out of it, or that pairing is lost.

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
getImageProps(cover, { alt: title, layout: "fill", sizes: "auto", absolute: true });
```

The host is the **target site's** server name, not the current request's — a link to a page of another site must name that site's server. A site with no server name configured falls back to the request's own scheme, host and port, which is what makes this work on a local instance. When neither is right — a reverse proxy, a preview host, a canonical domain — name the origin yourself: `absolute: "https://www.example.com"`.

## Cache dependencies

`JImage`, `getImageProps`, `buildImageUrl` and `buildBackgroundImageUrl` all register a render cache dependency on the image node, so replacing the image in jContent flushes the fragments that display it. Pass `cacheDependency: false` only when you register it yourself:

```tsx
server.render.addCacheDependency({ node: imageNode }, renderContext);
```

## Reference

- `JImage` — the component. Renders an unstyled `<img>`, except where the feature is styling (`fill`, `placeholder`). Server-side only.
- `getImageProps(node, options)` — the same props as plain data, for islands and for cases where you own the element.
- `buildImageUrl(node, size, options)` — one URL and the channel that carried the size.
- `buildBackgroundImageUrl(node, size, options)` — a CSS `url("…")` value.
- `buildThumbnailUrl(node)` — the smallest thumbnail Jahia pre-generated, or `undefined`.
- `inspectImageChannel(node, width, options)` — which channel a given width would take.
- `setImageDefaults({ loader, quality, unoptimized, breakpoints })` — the module's defaults.
- `readImageMeta(node)` — mime type and intrinsic dimensions, if you need them directly (`og:image:width`, for instance).
