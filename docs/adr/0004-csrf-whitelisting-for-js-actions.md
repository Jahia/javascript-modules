# CSRF whitelisting of JavaScript actions is the module author's responsibility

- Status: accepted
- Date: 2026-07-21

## Context and Problem Statement

Actions are invoked via `<nodeUrl>.<actionName>.do`. Unsafe HTTP methods (POST/PUT/DELETE) on `.do` URLs are blocked by Jahia's CSRF guard module unless the URL pattern is whitelisted through its OSGi configuration factory (PID `org.jahia.modules.jahiacsrfguard`, property `whitelist = *.<actionName>.do`). Java module authors ship such a config file with their module today. What should the engine do for JS-declared actions?

## Considered Options

1. **Document-only**: the JS module ships its own `settings/configurations/org.jahia.modules.jahiacsrfguard-<moduleName>.cfg`, exactly like Java modules.
2. Engine auto-registers a ConfigAdmin factory instance covering each JS action's URL on deploy.
3. Opt-in flag on the action declaration that triggers auto-registration.

## Decision Outcome

Chosen option: **1 — document-only.**

JS modules already ship OSGi configs: the bundle transformer maps `settings/**` into `META-INF/**`, and Jahia deploys `META-INF/configurations/*.cfg` on module install. So the recipe is one file in the module:

```properties
# settings/configurations/org.jahia.modules.jahiacsrfguard-mymodule.cfg
whitelist = *.myAction.do
```

- Security posture: opting out of CSRF protection stays an **explicit, auditable, per-module act** that reviewers and operators can see in the module source and in the deployed configuration — never a side effect of declaring an action.
- Parity: identical mental model and operational behavior as Java modules.
- Zero engine code, zero new lifecycle to maintain.

The main cost — a developer forgetting the file and getting an opaque 403 on POST — is mitigated by a prominent section in the actions guide and by the test module exercising the recipe end-to-end.

### Rejected alternative: ConfigAdmin auto-registration (options 2 and 3)

The engine would create/update a `jahiacsrfguard` factory configuration per JS bundle (marker property for ownership, deleted on undeploy). Rejected because:

- **Silently weakens CSRF protection** (option 2): developers never see the opt-out happen; a compromised or careless module opens POST endpoints without any reviewable artifact.
- **Persistence hazards**: ConfigAdmin configurations survive crashes and uninstall-without-stop, requiring marker-based reconciliation logic to avoid orphaned whitelist entries.
- **Cluster semantics are unclear**: Jahia's configuration management synchronizes file-based configs; programmatically created factory instances may not propagate, or may fight with operator-managed `.cfg` files for the same factory.
- Undefined behavior when the CSRF-guard module is absent or disabled.

Option 3 (explicit `csrfWhitelisted: true` flag) fixes the visibility objection but keeps all the lifecycle/cluster hazards; it can be revisited if the documented recipe proves to be a recurring support burden.
