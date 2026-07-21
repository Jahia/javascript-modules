---
# Allowed version bumps: patch, minor, major
javascript-modules: minor
---

Java modules can now consume JavaScript-declared server extensions through the new `JSServerExtensionInvoker` OSGi service. A module can define its own extension type, let JavaScript modules contribute entries via `server.registry.add`, and invoke their callbacks from Java without depending on GraalVM APIs. This enables, for example, form-field validators written in JavaScript to run during server-side form submission processing.
