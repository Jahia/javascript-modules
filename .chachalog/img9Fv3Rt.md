---
# Allowed version bumps: patch, minor, major
javascript-modules: minor
---

Made the image API usable on a fluid site: a slot described by its own `sizes`, first-class `sizes="auto"`, full `<img>` attribute pass-through, a pluggable loader, and CSS background and absolute URLs. (#766)

A slot is described **once**, and the candidate files follow that one description. `<JImage node={cover} alt={title} slotWidth={400} />` when the markup knows the slot's width in CSS pixels; `<JImage node={card} alt="" sizes="auto" />` when only CSS knows it — a percentage, a grid cell, an aspect-ratio box, a slot constrained by its height, which on a fluid design is most of them. Writing both is a type error, because the two used to disagree in silence: the `sizes` was emitted while the candidates were still derived from the `slotWidth`. `layout="fixed"` takes no `sizes` at all, its whole meaning being that the slot is one number, and `fill` is now only for the image positioned _over_ a parent that owns the box.

The component forwards every `<img>` attribute it does not compute itself, including `width` and `height`, which are required together so that an image takes its whole box from the markup or none of it, and an open `attributes` map carries anything else, including a value derived from the resolved image. A project that speaks its own URL dialect supplies a `loader`, with `quality` and `unoptimized`, per call or once per module with `setImageDefaults`. Outside the component, `getImageProps` also takes a `fallback` and now requires the render context, `buildBackgroundImageUrl` returns a ready CSS `url(…)` value, `buildImageUrl` registers the same cache dependency the component does, and `absolute` builds the URLs that `og:image`, canonical links and JSON-LD need — on `buildNodeUrl` too, so links get it as well.

The slot width is now `slotWidth`, freeing `width` for the HTML attribute it always looked like; the image that loads first is marked `preload` rather than `priority`, following `next/image` 16; and the data `getImageProps` returns is typed `ImgProps`, leaving `JImageProps` to mean the component's own props.
