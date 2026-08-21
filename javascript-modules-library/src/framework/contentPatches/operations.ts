import { toReport } from "./jcr.js";
import type { ContentPatchOperations, JavaContentPatchOperations } from "./types.js";

/**
 * Builds the `patch` part of the content patch context: a thin, typed façade over the Java
 * operations engine (batching, i18n, guard rails and dry-run all live there, shared with Groovy and
 * Java callers). This layer only reshapes the idiomatic TS surface — callbacks are passed through
 * as-is (GraalVM coerces JS functions to the Java functional interfaces), with `undefined` returns
 * normalized to `null`, the engine's "leave untouched" marker.
 */
export const createContentPatchOperations = (
  ops: JavaContentPatchOperations,
): ContentPatchOperations => ({
  removePropertyValues: (options) => toReport(ops.removePropertyValues(options)),

  setPropertyValues: ({ value, ...options }) =>
    typeof value === "function"
      ? toReport(
          ops.setPropertyValues(
            options,
            (node, locale) => value(node, locale ?? undefined) ?? null,
          ),
        )
      : toReport(ops.setPropertyValues({ ...options, value })),

  convertPropertyValues: ({ convert, ...options }) =>
    toReport(ops.convertPropertyValues(options, (value, node) => convert(value, node) ?? null)),

  removeNodeType: (options) => toReport(ops.removeNodeType(options)),

  changeNodeType: (options) => toReport(ops.changeNodeType(options)),
});
