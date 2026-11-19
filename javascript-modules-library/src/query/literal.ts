import type { LiteralType } from "./constants.js";
import type { BindVariableValue, Literal } from "./model.js";
import { QueryError, assertName, assertPath } from "./validate.js";

/**
 * Literal construction. A literal carries a type and the string form of its value, which is what
 * the sink hands to `ValueFactory.createValue(String, int)` and what the formatter writes inside a
 * `CAST`.
 *
 * A malformed value of the right JavaScript type throws `LITERAL_PRECISION`. A value whose
 * JavaScript type has no literal type at all throws `UNSUPPORTED`.
 */

/** The JavaScript values `literal()` infers a type from. */
export type LiteralValue = string | number | boolean | bigint | Date;

/** Everything the facade accepts where a static operand is expected. */
export type LiteralArg = LiteralValue | Literal | BindVariableValue;

/** The values a query carries for its bind variables. */
export type Bindings = Readonly<Record<string, LiteralValue | Literal>>;

/**
 * The one date form Jackrabbit parses. `ISO8601.parse`, which `ValueFactory.createValue(String,
 * DATE)` calls, reads the string at fixed offsets, so the year is exactly four digits, the
 * millisecond field is required and is exactly three digits, and the zone is `Z` or an offset. A
 * missing zone parses too, but it is rejected here, because the server then reads the value in its
 * own time zone.
 */
const ISO_8601_WITH_ZONE = /^[+-]?\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}(?:Z|[+-]\d{2}:\d{2})$/;

const INTEGER_TEXT = /^[+-]?\d+$/;

const DECIMAL_TEXT = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

const BIND_VARIABLE_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

function make(type: LiteralType, value: string): Literal {
  return { kind: "Literal", type, value };
}

function precision(message: string, at: string): QueryError {
  return new QueryError("LITERAL_PRECISION", message, at);
}

function isLiteral(value: unknown): value is Literal {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    (value as { kind: unknown }).kind === "Literal"
  );
}

function requireText(value: string, what: string, at: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw precision(`${what} needs a non-empty string`, at);
  }

  return value;
}

function integerText(value: number | bigint | string, at: string): string {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "number") {
    if (!Number.isInteger(value)) {
      throw precision(`long() needs an integer, got ${value}`, at);
    }

    if (!Number.isSafeInteger(value)) {
      throw precision(
        `long() needs a safe integer, got ${value}. Pass a bigint or a string to keep every digit`,
        at,
      );
    }

    return String(value);
  }

  if (!INTEGER_TEXT.test(value)) {
    throw precision(`long() needs an integer, got ${JSON.stringify(value)}`, at);
  }

  return value;
}

function decimalText(value: number | bigint | string, what: string, at: string): string {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw precision(`${what} needs a finite number, got ${value}`, at);
    }

    return String(value);
  }

  if (!DECIMAL_TEXT.test(value)) {
    throw precision(`${what} needs a decimal number, got ${JSON.stringify(value)}`, at);
  }

  return value;
}

/**
 * Builds a literal from a JavaScript value, and returns a literal unchanged.
 *
 * A `string` gives `String`, a `boolean` gives `Boolean`, a `bigint` gives `Long` and a `Date`
 * gives `Date` through `toISOString()`. A `number` gives `Long` when it is an integer and `Double`
 * otherwise. An integer beyond `Number.MAX_SAFE_INTEGER` throws `LITERAL_PRECISION`, because the
 * digits it would write are not the digits the caller meant.
 *
 * @remarks
 *   Jahia support: runs on the index. A `Double` literal silently matches nothing against a `Long`
 *   property, so pass `long()` when the property is a long.
 */
export function literal(value: LiteralValue | Literal): Literal {
  switch (typeof value) {
    case "string":
      return make("String", value);
    case "boolean":
      return make("Boolean", value ? "true" : "false");
    case "bigint":
      return make("Long", value.toString());
    case "number":
      if (!Number.isFinite(value)) {
        throw precision(`literal() needs a finite number, got ${value}`, "literal");
      }

      if (!Number.isInteger(value)) {
        return make("Double", String(value));
      }

      if (!Number.isSafeInteger(value)) {
        throw precision(
          `literal() needs a safe integer, got ${value}. Pass a bigint or long() to keep every digit`,
          "literal",
        );
      }

      return make("Long", String(value));
    case "object":
      if (value instanceof Date) {
        return date(value);
      }

      if (isLiteral(value)) {
        return value;
      }

      break;
  }

  throw new QueryError(
    "UNSUPPORTED",
    `literal() has no literal type for ${String(value)}`,
    "literal",
  );
}

/**
 * A `LONG` literal. Pass a bigint or a string when the value does not fit in a safe integer.
 *
 * @remarks
 *   Jahia support: runs on the index.
 */
export function long(value: number | bigint | string): Literal {
  return make("Long", integerText(value, "long"));
}

/**
 * A `DOUBLE` literal.
 *
 * @remarks
 *   Jahia support: runs on the index.
 */
export function double(value: number | bigint | string): Literal {
  return make("Double", decimalText(value, "double()", "double"));
}

/**
 * A `DECIMAL` literal. Pass a string to keep a precision a JavaScript number cannot hold.
 *
 * @remarks
 *   Jahia support: runs on the index.
 */
export function decimal(value: number | bigint | string): Literal {
  return make("Decimal", decimalText(value, "decimal()", "decimal"));
}

/**
 * A `DATE` literal. A `Date` is written with `toISOString()`, and a string must be
 * `YYYY-MM-DDThh:mm:ss.SSS` followed by `Z` or by an offset such as `+02:00`. The millisecond field
 * is required, because Jackrabbit reads the string at fixed offsets. A date without a time, without
 * milliseconds, with a different number of fractional digits, or with a year longer than four
 * digits is rejected.
 *
 * @remarks
 *   Jahia support: runs on the index.
 */
export function date(value: Date | string): Literal {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw precision("date() needs a valid Date", "date");
    }

    const text = value.toISOString();

    // A year outside 0000 to 9999 is written in the expanded form, such as `+275760-09-13`, which
    // Jackrabbit does not read.
    if (!ISO_8601_WITH_ZONE.test(text)) {
      throw precision(`date() needs a year of four digits, got ${JSON.stringify(text)}`, "date");
    }

    return make("Date", text);
  }

  if (typeof value !== "string" || !ISO_8601_WITH_ZONE.test(value)) {
    throw precision(
      `date() needs an ISO 8601 date and time with milliseconds and a zone, such as ` +
        `2026-09-01T00:00:00.000+02:00, got ${JSON.stringify(value)}`,
      "date",
    );
  }

  return make("Date", value);
}

/**
 * A `NAME` literal. The value must be a JCR name.
 *
 * @remarks
 *   Jahia support: runs on the index.
 */
export function name(value: string): Literal {
  assertName(value, "name()", "name");
  return make("Name", value);
}

/**
 * A `PATH` literal. The value must be a JCR path, absolute or relative.
 *
 * @remarks
 *   Jahia support: runs on the index.
 */
export function path(value: string): Literal {
  assertPath(value, "path()", "path");
  return make("Path", value);
}

/**
 * A `REFERENCE` literal, which holds the identifier of the target node.
 *
 * @remarks
 *   Jahia support: partial. `JCRValueFactoryImpl` builds a weak reference for both types, so a
 *   `REFERENCE` literal executes as a `WEAKREFERENCE` one.
 */
export function reference(value: string): Literal {
  return make("Reference", requireText(value, "reference()", "reference"));
}

/**
 * A `WEAKREFERENCE` literal, which holds the identifier of the target node.
 *
 * @remarks
 *   Jahia support: runs on the index.
 */
export function weakReference(value: string): Literal {
  return make("WeakReference", requireText(value, "weakReference()", "weakReference"));
}

/**
 * A `URI` literal.
 *
 * @remarks
 *   Jahia support: runs on the index.
 */
export function uri(value: string): Literal {
  return make("URI", requireText(value, "uri()", "uri"));
}

/**
 * A bind variable, which the sink replaces with a typed literal before it calls the host factory. A
 * variable without a binding throws `UNBOUND_VARIABLE` before any host call.
 *
 * @remarks
 *   Jahia support: the QOM proxy fails on `bindValue` at execution, so the sink inlines the value
 *   instead.
 */
export function bindVariable(bindVariableName: string): BindVariableValue {
  if (typeof bindVariableName !== "string" || !BIND_VARIABLE_NAME.test(bindVariableName)) {
    throw new QueryError(
      "INVALID_NAME",
      `A bind variable name must start with a letter or an underscore and hold letters, digits and underscores only, got ${JSON.stringify(bindVariableName)}`,
      "bindVariable",
    );
  }

  return { kind: "BindVariableValue", bindVariableName };
}

/** Short form of {@link bindVariable}. */
export const $ = bindVariable;
