import type { RenderContext, Resource } from "org.jahia.services.render";

/** Declaration of a render filter. */
export interface RenderFilterDeclaration {
  /** Unique key of the filter in the registry. */
  key: string;
  /**
   * Position of the filter in the render chain (may be fractional). Lower priorities execute first.
   *
   * @default 0
   */
  priority?: number;
  /** Human-readable description of the filter. */
  description?: string;
  /** Only apply the filter to resources of these node types. */
  applyOnNodeTypes?: string | string[];
  /** Only apply the filter in these render modes (e.g. "live", "preview", "edit"). */
  applyOnModes?: string | string[];
  /** Only apply the filter on these render configurations (e.g. "page", "module"). */
  applyOnConfigurations?: string | string[];
  /** Only apply the filter on these templates. */
  applyOnTemplates?: string | string[];
  /** Only apply the filter on these template types (e.g. "html"). */
  applyOnTemplateTypes?: string | string[];
}

/** Callbacks of a render filter; both receive the raw Java rendering objects. */
export interface RenderFilterCallbacks {
  /**
   * Invoked before the resource is rendered; returning a non-null string short-circuits the chain
   * with that output.
   *
   * `chain` is the raw Java `RenderChain`, typed as `unknown` because it has no generated typing.
   */
  prepare?: (
    renderContext: RenderContext,
    resource: Resource,
    chain: unknown,
  ) => string | null | undefined | Promise<string | null | undefined>;
  /**
   * Invoked after the resource is rendered, with the output produced so far; returns the (possibly
   * transformed) output. Returning null/undefined keeps the previous output.
   *
   * `chain` is the raw Java `RenderChain`, typed as `unknown` because it has no generated typing.
   */
  execute?: (
    previousOutput: string,
    renderContext: RenderContext,
    resource: Resource,
    chain: unknown,
  ) => string | null | undefined | Promise<string | null | undefined>;
}

/**
 * Registers a render filter, participating in Jahia's render chain like a Java `AbstractFilter`.
 *
 * ```ts
 * registerRenderFilter(
 *   { key: "myModuleUppercaseTitles", priority: 50, applyOnNodeTypes: "mymodule:title" },
 *   { execute: (previousOutput) => previousOutput.toUpperCase() },
 * );
 * ```
 *
 * Filters run on every matching render — keep them fast. Callbacks may be `async` (microtask-only:
 * the server runtime has no timers or async I/O) **only when the render is host-initiated**. A render
 * started from JS — typically a nested render through the `<Render>` component — cannot drain the
 * microtask queue, so filters that may match nested renders must use synchronous callbacks.
 *
 * Keys live in a single platform-wide registry namespace; prefix them with your module name to
 * avoid collisions.
 *
 * @param declaration The filter declaration; `applyOn*` options restrict when the filter runs.
 * @param callbacks The `prepare` and/or `execute` callbacks.
 */
export const registerRenderFilter = (
  {
    key,
    priority,
    description,
    applyOnNodeTypes,
    applyOnModes,
    applyOnConfigurations,
    applyOnTemplates,
    applyOnTemplateTypes,
  }: RenderFilterDeclaration,
  { prepare, execute }: RenderFilterCallbacks,
): void => {
  server.registry.add("render-filter", key, {
    ...(priority !== undefined && { priority }),
    ...(description !== undefined && { description }),
    ...(applyOnNodeTypes !== undefined && { applyOnNodeTypes: join(applyOnNodeTypes) }),
    ...(applyOnModes !== undefined && { applyOnModes: join(applyOnModes) }),
    ...(applyOnConfigurations !== undefined && {
      applyOnConfigurations: join(applyOnConfigurations),
    }),
    ...(applyOnTemplates !== undefined && { applyOnTemplates: join(applyOnTemplates) }),
    ...(applyOnTemplateTypes !== undefined && { applyOnTemplateTypes: join(applyOnTemplateTypes) }),
    ...(prepare !== undefined && { prepare }),
    ...(execute !== undefined && { execute }),
  });
  console.debug(`Registered render filter: ${key}`);
};

const join = (value: string | string[]): string => (Array.isArray(value) ? value.join(",") : value);
