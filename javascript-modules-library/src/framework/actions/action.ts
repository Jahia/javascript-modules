import type { StandardSchemaV1 } from "./standardSchema.js";

/**
 * Thrown when the input of a safe action does not match its schema. Surfaced to the client as an
 * error with the validation `issues` attached.
 */
export class ActionValidationError extends Error {
  readonly issues: ReadonlyArray<StandardSchemaV1.Issue>;

  constructor(issues: ReadonlyArray<StandardSchemaV1.Issue>) {
    super(issues.map((issue) => issue.message).join("; ") || "Invalid action input");
    this.name = "ActionValidationError";
    this.issues = issues;
  }
}

/**
 * Wraps an action implementation with input validation ("safe action").
 *
 * The schema can come from any [Standard Schema](https://standardschema.dev) compatible library
 * (zod, valibot, arktype, …). The wrapped function is only called when the input is valid, and its
 * parameter type is inferred from the schema:
 *
 * ```ts
 * // rates.action.ts
 * import { action } from "@jahia/javascript-modules-library";
 * import { z } from "zod";
 *
 * export const getExchangeRate = action(z.object({ currency: z.string() }), ({ currency }) => {
 *   return lookupRate(currency);
 * });
 * ```
 *
 * On invalid input, the client call rejects with an error carrying the validation `issues`.
 *
 * @param schema Validates the single argument passed by the client.
 * @param implementation Runs with the validated (and possibly transformed) input.
 */
export const action = <Schema extends StandardSchemaV1, Return>(
  schema: Schema,
  implementation: (input: StandardSchemaV1.InferOutput<Schema>) => Return,
): ((input: StandardSchemaV1.InferInput<Schema>) => Promise<Awaited<Return>>) => {
  return async (input): Promise<Awaited<Return>> => {
    let result = schema["~standard"].validate(input);
    if (result instanceof Promise) result = await result;
    if (result.issues) {
      throw new ActionValidationError(result.issues);
    }
    return (await implementation(
      result.value as StandardSchemaV1.InferOutput<Schema>,
    )) as Awaited<Return>;
  };
};
