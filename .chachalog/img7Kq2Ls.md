---
# Allowed version bumps: patch, minor, major
javascript-modules: minor
---

Added an image API for rendering content images: an `Image` component, plus `getImageProps` and `buildImageUrl` for cases that need the data or just a URL. (#746)

Declare how the image sits in the page — `<Image node={cover} alt={title} width={400} />` — and the library sizes the file to the slot, offers the browser alternatives for high-density and narrow screens, reserves the space so the layout does not shift while it loads, and refreshes cached pages when an editor replaces the picture. Alternative text is now required, so a missing one is caught while you write the view rather than by an accessibility audit later. A new [Rendering Images](https://academy.jahia.com/documentation/jahia-cms/jahia-8-2/developer/javascript-module-development/images) guide explains which setups actually resize images, and which serve the original.
