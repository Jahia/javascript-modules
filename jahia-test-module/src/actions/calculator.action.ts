import { action, ActionError, type StandardSchemaV1 } from "@jahia/javascript-modules-library";

/**
 * Test fixtures for actions (.action.ts files): functions executed on the server, callable from the
 * client through generated fetch stubs.
 */

export const add = async (a: number, b: number) => a + b;

// exercises devalue-only types across the wire (Date, Map, Set)
export const echoKinds = (input: { date: Date; map: Map<string, number>; set: Set<string> }) => ({
  ...input,
  dateType: input.date instanceof Date,
  mapSize: input.map.size,
  setHas: input.set.has("present"),
});

// an ActionError is deliberate: its message travels to the caller
export const failOnPurpose = () => {
  throw new ActionError("Intentional failure");
};

// any other exception is masked with a generic message (actions are guest-callable)
export const failInternally = () => {
  throw new Error("secret implementation detail");
};

// depends on an event that never happens: the runtime must detect it instead of hanging
export const neverSettles = () => new Promise(() => {});

/** Hand-rolled Standard Schema, to avoid pulling a validation library into the test module. */
const positiveNumberInput: StandardSchemaV1<{ n: number }> = {
  "~standard": {
    version: 1,
    vendor: "javascript-modules-test",
    validate: (value) => {
      const n = (value as { n?: unknown } | null)?.n;
      return typeof n === "number" && n > 0
        ? { value: { n } }
        : { issues: [{ message: "n must be a positive number" }] };
    },
  },
};

export const safeDouble = action(positiveNumberInput, ({ n }) => n * 2);
