# Architecture Decision Records

This directory contains the Architecture Decision Records (ADRs) for the JavaScript Modules project, in [MADR](https://adr.github.io/madr/) style. An ADR captures a single architecturally significant decision: its context, the options considered, and the consequences we accept.

ADRs are numbered in the order they were accepted and are never rewritten once accepted — a superseding decision gets a new ADR that links back.

## Index

| ADR                                                              | Title                                                                                                      | Status   |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------- |
| [0001](0001-javascript-server-extension-points.md)               | Bridge JavaScript-declared server extension points through per-type registrars                             | accepted |
| [0002](0002-first-class-registry-types.md)                       | Use first-class registry types for each extension point                                                    | accepted |
| [0003](0003-typed-registration-wrappers.md)                      | Idiomatic TypeScript registration wrappers with a raw Java escape hatch                                    | accepted |
| [0004](0004-csrf-whitelisting-for-js-actions.md)                 | CSRF whitelisting of JavaScript actions is the module author's responsibility                              | accepted |
| [0005](0005-js-node-validators-single-bean-validation-bridge.md) | Bridge JS node validators through a single Bean Validation bean registered for `nt:base`                   | accepted |
| [0006](0006-javascript-content-patches.md)                       | Run JavaScript content patches through a dedicated registrar backed by core's patch status store           | accepted |
| [0007](0007-action-naming.md)                                    | Reserve "action" for client-callable server functions; rename the platform bridge to "legacy node actions" | accepted |
| [0008](0008-client-callable-actions.md)                          | Client-callable actions: dual-compiled `.action.ts` files over a single dispatch endpoint                  | accepted |
