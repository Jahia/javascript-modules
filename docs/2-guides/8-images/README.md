---
page:
  $path: /sites/academy/home/documentation/jahia/8_2/developer/javascript-module-development/images
  jcr:title: Rendering Images
  j:templateName: documentation
content:
  $subpath: document-area/content
---

Content images come from the JCR, and rendering one well means more than pointing an `<img>` at it: a browser should download a file sized for the slot it will occupy, the space it needs should be reserved before it arrives, editing the image should flush the cached fragments that show it, and a screen reader should be told what it is. The `Image` component does all of that from one declaration.

## The short version

```tsx
import { Image, jahiaComponent } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";

jahiaComponent(
  { nodeType: "example:article", componentType: "view" },
  ({ title, cover }: { title: string; cover?: JCRNodeWrapper }) => (
    <article>
      <h2>{title}</h2>
      <Image node={cover} alt={title} width={400} className="cover" />
    </article>
  ),
);
```

That renders a `<img>` with a `src` sized for the slot, a `srcSet` of alternatives the browser can pick from, a matching `sizes`, the image's intrinsic `width` and `height` so the layout does not shift when it loads, `loading="lazy"`, and a registered cache dependency on the image node.

## Declare the layout, not the numbers

The one number you provide is `width`: how wide the image's slot is, in CSS pixels. How that slot behaves is the `layout`:

| `layout`                | Meaning                                     | Use for                                    |
| ----------------------- | ------------------------------------------- | ------------------------------------------ |
| `constrained` (default) | at most `width`, shrinks with the viewport  | content in a column, cards in a fluid grid |
| `fixed`                 | always exactly `width`                      | avatars, logos, fixed-size thumbnails      |
| `full-width`            | always the viewport width; needs no `width` | heroes, full-bleed banners                 |

```tsx
<Image node={avatar} alt={fullName} layout="fixed" width={80} />
<Image node={hero} alt={title} layout="full-width" priority />
```

Everything else follows from that. `constrained` and `fixed` ask for the slot width and its 2× variant, so a high-density screen gets a sharp file; `constrained` and `full-width` also ask for the smaller sizes a narrow viewport can use. Candidates are always capped by the original — Jahia never upscales — and the original itself is only offered when it is close to the largest size actually requested, so an 8000-pixel master is never sent to fill a 640-pixel card.

If you genuinely need exact control, `widths` (candidate widths, in **image** pixels) and `sizes` (a raw [sizes attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#sizes)) override the derivation. Reach for them last: hand-written values are the part of responsive images that goes stale when a layout changes.

### Why two attributes at all

`srcSet` lists files with their widths (`photo.jpg?w=640 640w`). `sizes` tells the browser how much space the image will occupy _before_ layout happens (`(min-width: 400px) 400px, 100vw`). The browser divides one by the other, multiplies by the screen's device pixel ratio, and downloads the smallest file that still looks sharp. Get `sizes` wrong — or omit it — and the browser assumes the image fills the viewport and downloads far more than it needs. That is the arithmetic `layout` exists to do for you.

## Above the fold: `priority`

An image is lazy-loaded by default, which is wrong for the one image that is already on screen when the page opens — usually the largest, and the one the browser measures as [Largest Contentful Paint](https://web.dev/articles/lcp).

```tsx
<Image node={hero} alt={title} layout="full-width" priority />
```

`priority` loads it eagerly and at high fetch priority. Use it on one image per page.

## Alternative text is required

`alt` is not optional, because a missing one is invisible until someone using a screen reader hits it. Describe what the image shows, in the page's language:

```tsx
<Image node={photo} alt={t("alt.estate", { estate: title })} width={400} />
```

An image that carries no information of its own — a decorative flourish, or one that only repeats an adjacent caption — is declared with `alt=""`. That is a deliberate statement, not a shortcut.

## What actually resizes the image, and where

This is the part that surprises people: **a plain Jahia instance does not resize images on request.** The size travels differently depending on where the asset lives, and `buildImageUrl` reports which channel it used.

| Channel     | When                                                                                 | Resizes?                                                                                                                                                                                                                                                           |
| ----------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `provider`  | the asset is mounted from an external provider (a DAM such as Keepeek or Cloudinary) | Yes — the provider's decorator builds a signed, transformed URL                                                                                                                                                                                                    |
| `thumbnail` | the requested width matches a thumbnail Jahia pre-generated (150px, 350px)           | Yes, and this is the only one that works with no extra infrastructure                                                                                                                                                                                              |
| `query`     | anything else on the default provider: the size becomes `?w=` / `?h=`                | Only behind [Media Optimization](https://academy.jahia.com/documentation/jahia-cms/jahia-8-2/developer/optional-features/media-optimization-cloudimage) (Jahia Cloud, live mode). Elsewhere the file servlet ignores the parameters and returns the original bytes |
| `original`  | vectors, and any request that matches the original size                              | Nothing to do                                                                                                                                                                                                                                                      |

So on your local instance, a `srcSet` full of `?w=` candidates is expected, and every one of them returns the same file. Nothing is broken: the markup is correct, and it starts saving bytes the moment the site runs somewhere that honours the hint. If you want to see real per-width files locally, mount a DAM or request a thumbnail width.

## Images inside an island

An island's props are serialized, so a React element cannot be one of them, and its server-rendered children are frozen — a client component cannot re-render them. A gallery that swaps images on click therefore needs image **data**, which is exactly what `getImageProps` returns:

```tsx
// gallery.server.tsx
import { getImageProps, Island } from "@jahia/javascript-modules-library";

const images = photos.map((photo) => getImageProps(photo, { alt: title, width: 800 }));

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

`ImageProps` is plain, serializable data, and `alt` is required there too.

## Cache dependencies

`Image` and `getImageProps` register a render cache dependency on the image node, so replacing the image in jContent flushes the fragments that display it. If you build URLs yourself with `buildImageUrl`, register it yourself:

```tsx
server.render.addCacheDependency({ node: imageNode }, renderContext);
```

## Reference

- `Image` — the component; renders an unstyled `<img>`, so pass a `className`. Server-side only.
- `getImageProps(node, options)` — the same props as plain data, for islands and for cases where you own the element.
- `buildImageUrl(node, size)` — one URL and the channel that carried the size.
- `readImageMeta(node)` — mime type and intrinsic dimensions, if you need them directly.
