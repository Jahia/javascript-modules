# Use first-class registry types for each extension point

* Status: accepted
* Date: 2026-07-21

## Context and Problem Statement

JS modules declare objects in the engine registry (`server.registry.add(type, key, ...)`). The registry namespaces entries by `type + "-" + key`. The POC ([npm-modules-engine#125](https://github.com/Jahia/npm-modules-engine/pull/125)) registered all extension points under a single umbrella `type: 'service'` with a `serviceType` property as a second-level discriminator. How should the new extension points be keyed?

## Considered Options

1. **First-class registry types**: `action`, `choicelist-initializer`, `node-validator` (kebab-case, like the existing `view`, `viewRenderer`, `render-filter`, `bundleInitializer`).
2. POC style: `type: 'service'` + `serviceType` discriminator.

## Decision Outcome

Chosen option: **1 — first-class registry types.**

* The registry keys entries as `type-key`. With a shared `service` type, an action named `foo` and a choicelist initializer named `foo` collide and `Registry.add` throws. For actions and choicelists the key *is* the platform-visible name, so cross-kind collisions are a real hazard, not a theoretical one.
* Registrar discovery uses `Registry.find({type, bundleKey})` — exactly the pattern `ViewsRegistrar` and `RenderFilterRegistrar` already use. A second-level discriminator would add filtering logic for no benefit.
* It matches how the platform is described ("registry of views, of render filters, of actions") and the registry conventions developers already know from jContent.
* Nothing in the POC exploited the `service` umbrella; its own TODOs pointed at dedicated typed registration functions.

The existing `render-filter` type string is kept as-is for backward compatibility with modules that call `server.registry.add('render-filter', ...)` directly.

### Consequences

* Good: no cross-kind key collisions; discovery stays a single exact-match filter.
* Good: each type can evolve its entry shape independently.
* Bad: one more type string to know per extension point — mitigated by the typed wrappers ([ADR-0003](0003-typed-registration-wrappers.md)), which make the type string an implementation detail most developers never see.
