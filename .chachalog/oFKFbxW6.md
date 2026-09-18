---
# Allowed version bumps: patch, minor, major
javascript-modules: minor
---

Bumped embedded dependencies. (#658, #664, #793)

| Dependency    | From (JSM 1.2.0) | To (JSM 1.3.0) |
| ------------- | ---------------- | -------------- |
| devalue       | 5.6.4            | 5.9.2          |
| i18next       | 25.7.3           | 26.4.2         |
| react         | 19.2.3           | 19.3.0         |
| react-dom     | 19.2.3           | 19.3.0         |
| react-i18next | 16.5.0           | 17.0.14        |

We decided to upgrade i18next and i18next-react in a minor version because, as far as we're aware, the breaking changes remove deprecated features that were never put in place in recent codebases. If this assumption is incorrect, please reach out to us.
