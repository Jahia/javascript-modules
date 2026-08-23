---
# Allowed version bumps: patch, minor, major
javascript-modules: minor
---

Made the image API usable on a fluid site: a `fill` layout, first-class `sizes="auto"`, full `<img>` attribute pass-through, a pluggable loader, and CSS background and absolute URLs. (#766)

`<JImage node={card} alt="" layout="fill" sizes="auto" />` covers the slot whose width no view can know — a percentage, a grid cell, an aspect-ratio box — which on a fluid design is most of them. The component now forwards every `<img>` attribute it does not compute itself, including `width` and `height`, so an image can take its box from the markup with no CSS rule at all, and an open `attributes` map carries anything else, including a value derived from the resolved image. A project that speaks its own URL dialect supplies a `loader`, with `quality` and `unoptimized`, per call or once per module with `setImageDefaults`. Outside the component, `buildBackgroundImageUrl` returns a ready CSS `url(…)` value, `buildImageUrl` registers the same cache dependency the component does, and `absolute` builds the URLs that `og:image`, canonical links and JSON-LD need — on `buildNodeUrl` too, so links get it as well.

The slot width is now `slotWidth`, freeing `width` for the HTML attribute it always looked like, and the image that loads first is marked `preload` rather than `priority`, following `next/image` 16.
