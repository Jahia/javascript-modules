# javascript-modules Changelog

## 1.3.0

### New Features

* `buildNodeUrl` now autocollects cache dependencies for the content it links to, preventing 404 errors when the linked content is renamed or moved. (#783)

  This mechanism is enabled by default but can be disabled on a per-view basis by setting `"cache.autocollectDependencies": "false"` in the view's properties, or on a per-call basis with the new `autocollectDependency: false` option in `buildNodeUrl`.

* Introduced `<JImage>` and `getImageProps` to render responsive images from an image node: `srcset` and `sizes` are derived from the image's intrinsic size, `alt` falls back to the image title, and `width` / `height` are set to prevent layout shifts. (#789)

  On a default Jahia instance every candidate serves the original file. A DAM (Cloudinary, Keepeek) or an image resizer (Cloudimage) is required for the resizing to take effect.

* Bumped embedded dependencies. (#658, #664, #793)

  | Dependency    | From (JSM 1.2.0) | To (JSM 1.3.0) |
  | ------------- | ---------------- | -------------- |
  | devalue       | 5.6.4            | 5.9.2          |
  | i18next       | 25.7.3           | 26.4.2         |
  | react         | 19.2.3           | 19.3.0         |
  | react-dom     | 19.2.3           | 19.3.0         |
  | react-i18next | 16.5.0           | 17.0.14        |

  We decided to upgrade i18next and react-i18next in a minor version because, as far as we're aware, the breaking changes remove deprecated features that were never put in place in recent codebases. If this assumption is incorrect, please reach out to us.

* `buildEndpointUrl`, `buildNodeUrl` and `buildModuleFileUrl` now accept an `absolute` option to prefix the URL with the server host.

  ```jsx
  <meta property="og:url" content={buildNodeUrl(currentNode, { absolute: true })} />
  ```

* Expose `JCRStoreProvider` in TypeScript types. (#790)

### Bug Fixes

* We have migrated our build pipelines and test suites to Vite 8 and Rolldown to ensure JS Modules work with the latest versions of this stack. (#668)

  This is not a breaking change, we support all Vite versions from 6 to 8.

* Handle GraphQL subrequests correctly. (#681)

* `npm init @jahia/module` can now scaffold a project without a single prompt, which makes it usable from scripts, CI pipelines and coding agents: (#715)

  ```bash
  npm init @jahia/module@latest my-module -- --template hello-world --yes
  ```

* `buildNodeUrl` default mode detection has been improved to preserve links within the editframe in `edit` mode. Other modes are unaffected. (#788)

* Fixed absolute areas with `readOnly="children"` so they can be edited on their owning page. (#679)

* `server.render.addCacheDependency({ uuid }, renderContext)` now correctly registers the dependency, instead of doing nothing. (#792)
