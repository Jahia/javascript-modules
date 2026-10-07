---
# Allowed version bumps: patch, minor, major
javascript-modules: minor
---

Introduced `<JImage>` and `getImageProps` to render responsive images from an image node: `srcset` and `sizes` are derived from the image's intrinsic size, `alt` falls back to the image title, and `width` / `height` are set to prevent layout shifts. (#789)

On a default Jahia instance every candidate serves the original file. A DAM (Cloudinary, Keepeek) or an image resizer (Cloudimage) is required for the resizing to take effect.
