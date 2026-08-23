/**
 * The engine sets `bundleKey` as a context global while it evaluates a module's server bundle, and
 * `useServerContext()` reports the same value while a view of that module renders.
 *
 * @see {@link setLinkDefaults} for why the link defaults are keyed by it.
 */
declare const bundleKey: string | undefined;

/**
 * Schemes a link may use, for every URL the library did not build itself — an author-supplied
 * `j:url` included.
 *
 * React neutralises `javascript:` alone, by substituting a throwing URL rather than removing the
 * attribute; `data:`, `blob:` and `vbscript:` are covered by this list and by nothing else.
 */
export const DEFAULT_ALLOWED_SCHEMES: readonly string[] = ["http", "https", "mailto", "tel", "ftp"];

/** The parts of a link a module can decide once instead of at every call site. */
export interface LinkDefaults {
  /**
   * Schemes this module's links may use. A subset of {@link DEFAULT_ALLOWED_SCHEMES}: a scheme the
   * library does not allow is dropped from the list rather than added to it.
   */
  allowedSchemes?: readonly string[];
}

/**
 * Every JavaScript module in an instance shares one GraalJS context, so a plain module-level
 * variable in this library would be engine-wide: one module's policy would govern another module's
 * links. Keying by bundle keeps a default inside the module that declared it.
 */
const defaultsByBundle = new Map<string, LinkDefaults>();

/**
 * Sets the link defaults of the calling module: every `JLink`, `getLinkProps` and
 * `resolveContentLink` in it uses them unless the call overrides them.
 *
 * Call it at the top level of a server file — the engine only knows which module is speaking while
 * it evaluates that module's bundle.
 *
 * @example
 *   ```ts
 *   // src/server/links.ts, imported once from a view
 *   setLinkDefaults({ allowedSchemes: ["http", "https"] });
 *   ```;
 *
 * @param defaults - Merged into whatever the module already set.
 * @throws When called outside a module's bundle evaluation, where there is no module to attach the
 *   defaults to.
 */
export function setLinkDefaults(defaults: LinkDefaults): void {
  if (typeof bundleKey !== "string" || !bundleKey) {
    throw new Error(
      "setLinkDefaults: no module to attach these defaults to. Call it at the top level of a " +
        "server file of your module, not inside a render or a callback.",
    );
  }

  defaultsByBundle.set(bundleKey, { ...defaultsByBundle.get(bundleKey), ...defaults });
}

/** The defaults a module registered, or an empty set for a module that registered none. */
export function getLinkDefaults(bundle: string | undefined): LinkDefaults {
  return (bundle ? defaultsByBundle.get(bundle) : undefined) ?? {};
}

/** Drops every module's defaults. Exported for tests, which share one module registry. */
export function clearLinkDefaults(): void {
  defaultsByBundle.clear();
}
