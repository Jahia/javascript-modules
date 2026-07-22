# Bridge JavaScript-declared server extension points through per-type registrars

- Status: accepted
- Date: 2026-07-21

## Context and Problem Statement

JavaScript modules can only contribute views/templates (and untyped render filters) today. Every other Jahia extension point — choicelist initializers, server-side node validators, actions, etc. — requires a Java OSGi module. We want JavaScript modules to declare these extension points directly, with a mechanism that makes adding _future_ extension points cheap.

A proof of concept existed in the pre-rename engine ([npm-modules-engine#125](https://github.com/Jahia/npm-modules-engine/pull/125)): a single `ServicesRegistrar` reading registry entries of `type='service'` and dispatching to per-type mapper classes held in a static map.

## Decision Drivers

- Adding a new extension point later must be a small, local change.
- Bridges must survive GraalVM context pooling: contexts are recycled and version-invalidated on every module (un)deploy, so JS function handles cannot be cached.
- Jahia core already consumes `Action`, `ModuleChoiceListInitializer`, `RenderFilter`, … as OSGi services (whiteboard-tracked by core's `OSGIRegistry` and piped into `TemplatePackageRegistry`) — we should ride that supported surface rather than reach into core internals.
- Registrars need per-type Jahia service dependencies (for collision warnings, etc.) that are naturally expressed as Declarative Services references.

## Considered Options

1. **One `Registrar` component per extension type, over a shared abstract base class** (`AbstractServiceRegistrar<S>`).
2. Single generic registrar with a static map of per-type mappers (the POC design).
3. Fully independent per-type registrars with duplicated bookkeeping (the pre-existing `RenderFilterRegistrar` pattern, copy-pasted).

## Decision Outcome

Chosen option: **1 — per-type registrar components over a shared base class.**

- Each extension point is a `@Component(service = Registrar.class)` extending `AbstractServiceRegistrar<S>`, which owns the generic flow: find registry entries for the bundle (`{type, bundleKey}`), build a bridge per entry (`createBridge`), publish it as an OSGi service, track per-bundle `ServiceRegistration`s, and unregister them on bundle stop — with per-entry error isolation.
- `JavascriptModuleListener` already discovers `Registrar` services dynamically (`@Reference(MULTIPLE, DYNAMIC, GREEDY)`) and replays already-started JS bundles to late-arriving registrars. A new extension point is therefore one new subclass — no central wiring to touch.
- Bridges **never cache JS function handles**. On every invocation they re-resolve the registry entry inside `GraalVMEngine.doWithContext(cp -> cp.getRegistry().get(type, key))`. If the entry is gone (module stopped mid-flight), they log and return a benign default instead of failing.
- Per-type DS components keep Jahia service dependencies (`@Reference`) local to the type that needs them, and a registrar that fails to activate does not take the others down.

Note on Declarative Services inheritance: bnd does not process DS annotations on inherited members, so the base class holds plain `protected` fields and every concrete registrar declares its own `@Reference`/`@Activate` methods.

### Whiteboard pattern alignment

The mechanism is deliberately whiteboard-shaped at both OSGi seams:

- **Registrars** are whiteboard participants: publish a `Registrar` service and `JavascriptModuleListener` picks it up.
- **Bridges** are whiteboard participants toward core: we publish plain `Action` / `ModuleChoiceListInitializer` / `RenderFilter` services and core's `OSGIRegistry` tracks them — the engine never calls core registration APIs for these.

The JS-side `server.registry` is _not_ a whiteboard — GraalVM code cannot publish OSGi services, and the registry is per-pooled-context. It acts as a staging registry that registrars mirror onto the OSGi whiteboard once per bundle start. (Node validators deviate from the whiteboard for correctness reasons — see [ADR-0005](0005-js-node-validators-single-bean-validation-bridge.md).)

### Consequences

- Good: new extension points are one subclass + one library wrapper; no dispatch table, no central registry of mappers.
- Good: unregistration and error isolation are written once, in the base class.
- Bad: one DS component per type (slightly more boilerplate than a static map) — accepted for testability and failure isolation.
- Neutral: every bridge invocation borrows a pooled GraalVM context (or reuses the current thread's); this is the same cost profile as the pre-existing render filters and views.

## Pros and Cons of the Options

### Option 2 — single registrar + static mapper map (POC)

- Good: one component.
- Bad: per-type Jahia dependencies pile into one class or mappers do raw service lookups outside DS.
- Bad: static map is not injectable/mockable; a broken mapper risks the whole dispatch.

### Option 3 — independent copy-pasted registrars

- Good: no abstraction to design.
- Bad: per-bundle bookkeeping and error handling duplicated (and already inconsistent: the legacy `RenderFilterRegistrar` lacked null-guards); every future type pays the full cost again.
