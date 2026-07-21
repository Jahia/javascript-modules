# Bridge JS node validators through a single Bean Validation bean registered for `nt:base`

* Status: accepted
* Date: 2026-07-21

## Context and Problem Statement

Jahia's server-side content validation is class-and-annotation based, not functional:

* Validators are registered per node type in a **global** map (`JCRStoreService.addValidator(nodeType, Class)`) — one validator class per node type platform-wide, last registration wins, `removeValidator(nodeType)` removes unconditionally.
* The class must implement `JCRNodeValidator` and expose a public `(JCRNodeWrapper)` constructor. On every session save, core instantiates it for each changed node matching the map key (`node.isNodeType(key)`) and runs Bean Validation (Hibernate Validator via Spring's `LocalValidatorFactoryBean`) over it, in two phases driven by validation groups: `(Default, DefaultSkipOnImportGroup)` then — only if clean — `(AdvancedGroup, AdvancedSkipOnImportGroup)`; imports omit the SkipOnImport groups.
* Violations map to editor errors through the violation's property path: a path resolving to a property definition produces a field-level `PropertyConstraintViolationException` (Content Editor field error); a blank path produces a node-level `NodeConstraintViolationException`.

JS validators are dynamic functions declared at module init. We need a bridge from this functional model onto the static class/annotation model, with correct field-level error mapping and import semantics.

## Decision Drivers

* **Correctness under multi-type matching**: core instantiates and validates the bean once *per matching map entry*. Naively registering one bridge class under each declared node type makes a node matching K entries produce K duplicate violation sets (Hibernate Validator's violation dedup compares `rootBean` by `equals()`, and fresh bridge instances are never equal).
* Never clobber Java-module validators: the global map is last-wins, and removal is by node type only.
* JS functions must be re-resolved from the pooled GraalVM context registry per invocation.
* Messages come from user code and become Hibernate Validator message *templates*.

## Considered Options

1. **One engine-owned bean class registered under the single sentinel key `nt:base`; all node-type matching done engine/JS-side.**
2. Register the bridge class under each JS-declared node type.
3. Generate a distinct annotated validator class per JS registration (bytecode generation).
4. Ride the `JCRNodeValidatorDefinition` bean path like Java modules.
5. JCR interceptors/listeners throwing on save.

## Decision Outcome

Chosen option: **1 — single bean under sentinel `nt:base`.**

* `JSNodeValidator implements JCRNodeValidator` carries four repeatable class-level `@JSValidation(mode=…, groups=…)` constraint annotations — one per Jahia phase combination (default / default-skip-on-import / advanced / advanced-skip-on-import). The `mode` attribute tells the shared `ConstraintValidator` which phase invoked it (the Bean Validation API does not expose active groups to `isValid`).
* Since every node `isNodeType("nt:base")` and the map holds exactly one JS entry, core instantiates the bean **exactly once per changed node per save** — every JS validator runs exactly once per phase, by construction. No dedup logic exists because none is needed.
* The `ConstraintValidator` obtains the engine registrar via OSGi lookup (`BundleUtils.getOsgiService`, the repo's established pattern; `null` → no-op) and dispatches: a fast volatile snapshot gate (`Mode → Set<declaredNodeType>`, checked with `node.isNodeType`) avoids entering GraalVM for unaffected nodes; matching entries are then re-resolved from the live context registry and executed inside `doWithContext`.
* Violations are built programmatically: `disableDefaultConstraintViolation()` + `buildConstraintViolationWithTemplate(escapedMessage)`, with `.addPropertyNode(propertyName)` for field-level errors or none for node-level (blank path). The annotation deliberately has **no `propertyName()` attribute**, so core falls back to the per-violation property path.
* **Message semantics**: Jahia's JCR validator factory (`applicationcontext-jcr.xml`) replaces Hibernate Validator's standard interpolation with `JahiaMessageInterpolator`, which performs **no EL and no `{…}` parameter parsing**. It strips the first and last character of the template and looks the remainder up as a resource-bundle key (ValidationMessages, then every deployed module's bundle, then Jahia internal messages, in the current UI locale); unresolved templates are returned **verbatim**. Consequently: no escaping is applied (it would leak backslashes); a message of exactly `{my.bundle.key}` form is localized through resource bundles — the same i18n mechanism Java validators use — and any other message is displayed as-is. The bridge guards one interpolator edge case: messages shorter than 2 characters (which would crash `substring(1, length-1)`) are replaced by a generic fallback.
* **Lifecycle**: the registrar ref-counts declared validators across JS bundles; it calls `addValidator("nt:base", JSNodeValidator.class)` on 0→1 and `removeValidator("nt:base")` on 1→0 **only after verifying the registered constructor's declaring class is ours** (never delete a foreign validator; WARN in both collision directions).
* **Error policy**: a *throwing* JS validator fails the save with a generic node-level violation (fail-closed, mirroring Java validator behavior; loud ERROR log with the validator key). A *malformed returned violation* (missing/non-string message) is logged and skipped — a shape bug must not brick every content save on the platform.

### Consequences

* Good: exactly-once execution semantics; no interference with Java-module validators; zero overhead when no JS validator is registered (the bridge is not in the map at all).
* Neutral: while any JS validator exists, every changed node pays one reflective constructor + up to four gated `isValid` calls (no GraalVM entry unless a declared type matches) — cheaper than core's own per-node mandatory-property loop.
* Neutral/documented: a failing default-phase JS validator suppresses the advanced phase for *all* JS validators on that node (per-bean group orchestration — same behavior as a single Java validator class).
* Documented platform caveats: violations on i18n properties are silently dropped by core when the session locale is null; never call `session.save()` inside a validator.
* This is a deliberate deviation from the whiteboard pattern of [ADR-0001](0001-javascript-server-extension-points.md): core's validator consumption is a keyed map with unconditional removal, so precise ref-counted lifecycle control matters more than whiteboard purity here.

## Pros and Cons of the Options

### Option 2 — register under each declared node type

* Bad: K-fold duplicate violations for nodes matching several entries; dedup would hinge on Hibernate-Validator-internal `equals` semantics.
* Bad: last-wins clobbering of Java validators on common node types; our removal could delete theirs.

### Option 3 — bytecode generation per registration

* Bad: ASM/ByteBuddy dependency, per-redeploy classloader and validator-metadata leaks, and it *still* ends in the same one-class-per-node-type map with the same collision hazards.

### Option 4 — `JCRNodeValidatorDefinition` path

* Bad: designed for module Spring contexts, which JS modules do not have; read once at bean (un)registration so dynamic add/remove per JS deploy does not propagate; inherits the same map-collision and duplicate-instantiation issues.

### Option 5 — JCR interceptors/listeners

* Bad: wrong lifecycle (no validation phases or import semantics), and no `CompositeConstraintViolationException` integration — field-level Content Editor errors are lost.
