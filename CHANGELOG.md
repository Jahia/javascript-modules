# javascript-modules Changelog

## 1.3.0

### New Features

* Fixed absolute areas with readOnly="children" so they can be edited on their owning page. (#679)

### Bug Fixes

* Updated `devalue` to [v5.6.4](https://github.com/sveltejs/devalue/releases/tag/v5.6.4). (#658)

* We have migrated our build pipelines and test suites to Vite 8 and Rolldown to ensure JS Modules work with the latest versions of this stack. (#668)

  This is not a breaking change, we support all Vite versions from 6 to 8.

* Make sure graphql subrequests are handled correctly (#681)

* `npm init @jahia/module` can now scaffold a project without a single prompt, which makes it usable from scripts, CI pipelines and coding agents: (#715)

  ```bash
  npm init @jahia/module@latest my-module -- --template hello-world --yes
  ```

* Exposed React's new `<Activity>` component and `useEffectEvent` hook, added in React 19.2.0. (#668)

* Bump devalue from 5.6.4 to 5.8.1 (#664)
