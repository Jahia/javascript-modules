import { createContentPatchJcr, ContentPatchSkipped } from "./jcr.js";
import { createContentPatchOperations } from "./operations.js";
import type {
  JavaContentPatchSupport,
  ContentPatchContext,
  ContentPatchDeclaration,
} from "./types.js";

/**
 * `registerContentPatch` calls are executed synchronously during module initialization. During this
 * time, `bundleKey` is set to the symbolic name of the active bundle.
 */
declare const bundleKey: string;

const RECOMMENDED_NAME_PATTERN = /^\d+\.\d+\.\d+-\d{2,}-[A-Za-z0-9._-]+$/;

/**
 * Registers a content patch: a run-once script executed on the processing server when a new version
 * of this module starts, used to reconcile existing content with definition changes (the JavaScript
 * equivalent of Jahia's Groovy `META-INF/patches` scripts).
 *
 * ```ts
 * registerContentPatch({ name: "2.0.0-01-remove-legacy-color" }, ({ patch }) => {
 *   patch.removePropertyValues({ nodeType: "mymodule:banner", property: "color" });
 * });
 * ```
 *
 * Execution is tracked in Jahia's module patch status store, keyed by `name`: whatever the outcome
 * (`.installed`, `.skipped`, `.failed`), a recorded content patch never runs again. A module's
 * content patches run in lexicographic order of their names; on failure the module still starts,
 * but its remaining content patches are halted (they stay pending).
 *
 * Content patches run synchronously on the module start thread and must NOT be async — keep heavy
 * work bounded through the built-in batching of the `patch.*` helpers and `jcr.forEachNode`.
 *
 * @param declaration The content patch declaration; `name` is its run-once identity and ordering
 *   key.
 * @param run Performs the content patch. Returning normally records `.installed`; throwing records
 *   `.failed`; calling `context.skip(reason)` records `.skipped`.
 */
export const registerContentPatch = (
  { name, description }: ContentPatchDeclaration,
  run: (context: ContentPatchContext) => void,
): void => {
  if (!name || !/^\S+$/.test(name)) {
    throw new Error(
      `Invalid content patch name "${name}": the name is the content patch's run-once identity and must be a non-empty string without whitespace`,
    );
  }
  if (!RECOMMENDED_NAME_PATTERN.test(name)) {
    console.debug(
      `Content patch name "${name}" does not follow the recommended "<moduleVersion>-<NN>-<slug>" convention (e.g. "2.0.0-01-remove-legacy-color"); note that content patches run in lexicographic name order`,
    );
  }
  const key = `${bundleKey}_content-patch_${name}`;
  if (server.registry.get("content-patch", key)) {
    throw new Error(
      `Duplicate content patch name "${name}": another content patch with the same name is already registered in this module`,
    );
  }
  server.registry.add("content-patch", key, {
    name,
    description: description ?? "",
    // Raw adapter invoked by the Java ContentPatchRegistrar with a ContentPatchSupport object. It returns
    // the result string to record; throwing records `.failed`. Keep both shapes in sync.
    execute: (support: JavaContentPatchSupport) => {
      const log = support.getLogger(name);
      const dryRun = support.isDryRun();
      const jcr = createContentPatchJcr(dryRun, log);
      const context: ContentPatchContext = {
        jcr,
        patch: createContentPatchOperations(jcr, support, log),
        log,
        dryRun,
        module: { name: support.getModuleName(), version: support.getModuleVersion() },
        skip: (reason) => {
          throw new ContentPatchSkipped(reason);
        },
      };
      if (description) log.info(description);
      try {
        const result = run(context) as unknown;
        if (result && typeof (result as PromiseLike<unknown>).then === "function") {
          throw new Error(
            `Content patch  returned a promise: content patches must be synchronous (do not use an async run function)`,
          );
        }
        return ".installed";
      } catch (error) {
        if (error instanceof ContentPatchSkipped) {
          log.info(`Content patch skipped: ${error.reason}`);
          return ".skipped";
        }
        throw error;
      }
    },
  });
  console.debug(`Registered content patch ${name}`);
};
