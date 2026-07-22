# Idiomatic TypeScript registration wrappers with a raw Java escape hatch

- Status: accepted
- Date: 2026-07-21

## Context and Problem Statement

The POC passed raw Java objects (`HttpServletRequest`, `ExtendedPropertyDefinition`, `JCRSessionWrapper`, `Locale`, …) straight into JS callbacks and expected Java-shaped return values. That is fast to build but couples module code to Java APIs, is hard to type, and leaks polyglot conversion pitfalls (e.g. nested JS objects converted with `Value.as(Map.class)`) into user code. How should the developer-facing API look?

## Decision Drivers

- Developer experience consistent with `jahiaComponent`: one exported function, TypeScript-typed, registration as a module-init side effect.
- Advanced use cases must stay possible: the underlying Java objects carry capabilities we cannot re-expose exhaustively.
- Polyglot value conversion must be controlled in one place, not in every module.

## Considered Options

1. **Idiomatic TS-first signatures with a `java` escape hatch, adaptation done in the library (TS side).**
2. Raw Java objects everywhere (POC style).
3. Fully abstracted JS API with no Java access.

## Decision Outcome

Chosen option: **1.**

- The library exports one registration function per extension point (`registerChoiceListInitializer`, `registerNodeLegacyAction`, `registerNodeValidator`, `registerRenderFilter`), siblings of `jahiaComponent` in `javascript-modules-library/src/framework/`.
- Each wrapper stores an _adapter_ function in the registry: the Java bridge always calls a stable, raw-shaped function; the TS adapter converts to/from the idiomatic shapes before invoking the user callback. **Java stays dumb and stable; the adaptation lives in TS**, where it is cheap to evolve and unit-test.
- Idiomatic context objects expose converted values (e.g. `locale` as a BCP-47 language tag via `Locale.toLanguageTag()`, parameters as `Record<string, string[]>`) and keep the raw Java objects under a `java` property (or as documented raw fields such as the `JCRNodeWrapper` itself, which is already the library's public node surface).
- Structured return values that must cross the boundary as JSON (action results) are **pre-stringified with `JSON.stringify` in the adapter** and parsed with `new JSONObject(String)` on the Java side. This sidesteps polyglot deep-conversion issues with nested objects/arrays that broke the POC's `new JSONObject(value.as(Map.class))` approach.
- Java types referenced in public signatures are provided by the existing java-ts-bind generation; types not yet generated (`ExtendedPropertyDefinition`, `URLResolver`, `Locale.toLanguageTag`) are added to the bind configuration with narrow method whitelists.
- Handlers may be `async`: every bridge settles returned promises through `JSPromise.settleOrThrow` (microtask-only — the server runtime has no timers or async I/O; rejections behave like synchronous throws). See [#688](https://github.com/Jahia/javascript-modules/issues/688).

### Consequences

- Good: typed, documented, discoverable API; conversion bugs are fixed once in the library.
- Good: no capability loss — the escape hatch keeps the full Java surface reachable.
- Bad: two representations of some values (idiomatic + raw) can confuse; mitigated by docs marking the `java` property as the escape hatch.
- Bad: the registry entry shape becomes a library↔engine contract that must be kept in sync (documented in both the wrapper and the bridge).
