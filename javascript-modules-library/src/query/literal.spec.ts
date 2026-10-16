import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
  $,
  bindVariable,
  date,
  decimal,
  double,
  literal,
  long,
  name,
  path,
  reference,
  uri,
  weakReference,
} from "./literal.js";
import { QueryError } from "./validate.js";

function errorCode(run: () => unknown): string | undefined {
  try {
    run();
    return undefined;
  } catch (error) {
    return error instanceof QueryError ? error.code : `not a QueryError: ${String(error)}`;
  }
}

describe("literal inference", () => {
  test("a string gives a String literal", () => {
    assert.deepEqual(literal("Home"), { kind: "Literal", type: "String", value: "Home" });
  });

  test("a string keeps its quotes, which the formatter doubles", () => {
    assert.equal(literal("it's").value, "it's");
  });

  test("a boolean gives a Boolean literal", () => {
    assert.deepEqual(literal(true), { kind: "Literal", type: "Boolean", value: "true" });
    assert.deepEqual(literal(false), { kind: "Literal", type: "Boolean", value: "false" });
  });

  test("a safe integer gives a Long literal", () => {
    assert.deepEqual(literal(42), { kind: "Literal", type: "Long", value: "42" });
    assert.deepEqual(literal(-7), { kind: "Literal", type: "Long", value: "-7" });
    assert.deepEqual(literal(0), { kind: "Literal", type: "Long", value: "0" });
  });

  test("a number that is not an integer gives a Double literal", () => {
    assert.deepEqual(literal(4.5), { kind: "Literal", type: "Double", value: "4.5" });
  });

  test("a bigint gives a Long literal, whatever its size", () => {
    assert.deepEqual(literal(9007199254740993n), {
      kind: "Literal",
      type: "Long",
      value: "9007199254740993",
    });
  });

  test("a Date gives a Date literal in ISO 8601 with a zone", () => {
    assert.deepEqual(literal(new Date(Date.UTC(2026, 8, 1))), {
      kind: "Literal",
      type: "Date",
      value: "2026-09-01T00:00:00.000Z",
    });
  });

  test("a literal passes through unchanged", () => {
    const value = long("3");
    assert.equal(literal(value), value);
  });

  test("an integer beyond MAX_SAFE_INTEGER throws LITERAL_PRECISION", () => {
    assert.equal(
      errorCode(() => literal(2 ** 53)),
      "LITERAL_PRECISION",
    );
  });

  test("a number that is not finite throws LITERAL_PRECISION", () => {
    assert.equal(
      errorCode(() => literal(Number.NaN)),
      "LITERAL_PRECISION",
    );
    assert.equal(
      errorCode(() => literal(Number.POSITIVE_INFINITY)),
      "LITERAL_PRECISION",
    );
  });

  test("a value with no literal type throws UNSUPPORTED", () => {
    assert.equal(
      errorCode(() => literal(null as unknown as string)),
      "UNSUPPORTED",
    );
    assert.equal(
      errorCode(() => literal({ selector: "p" } as unknown as string)),
      "UNSUPPORTED",
    );
  });
});

describe("explicit literal constructors", () => {
  test("long accepts a number, a bigint and a string", () => {
    assert.deepEqual(long(3), { kind: "Literal", type: "Long", value: "3" });
    assert.equal(long(9007199254740993n).value, "9007199254740993");
    assert.equal(long("-12").value, "-12");
  });

  test("long rejects a value that is not an integer", () => {
    assert.equal(
      errorCode(() => long(4.5)),
      "LITERAL_PRECISION",
    );
    assert.equal(
      errorCode(() => long("4.5")),
      "LITERAL_PRECISION",
    );
    assert.equal(
      errorCode(() => long(2 ** 53)),
      "LITERAL_PRECISION",
    );
  });

  test("double keeps a whole number as a Double", () => {
    assert.deepEqual(double(3), { kind: "Literal", type: "Double", value: "3" });
    assert.equal(double("1.5e10").value, "1.5e10");
    assert.equal(
      errorCode(() => double("one")),
      "LITERAL_PRECISION",
    );
    assert.equal(
      errorCode(() => double(Number.NaN)),
      "LITERAL_PRECISION",
    );
  });

  test("decimal keeps the precision of a string", () => {
    assert.deepEqual(decimal("1.000000000000000000001"), {
      kind: "Literal",
      type: "Decimal",
      value: "1.000000000000000000001",
    });
    assert.equal(
      errorCode(() => decimal("1.2.3")),
      "LITERAL_PRECISION",
    );
  });

  test("date accepts a Date and an ISO 8601 string with milliseconds and a zone", () => {
    assert.equal(date(new Date(Date.UTC(2026, 8, 1, 12))).value, "2026-09-01T12:00:00.000Z");
    assert.equal(date("2026-09-01T00:00:00.000+02:00").value, "2026-09-01T00:00:00.000+02:00");
    assert.equal(date("2026-09-01T00:00:00.000Z").value, "2026-09-01T00:00:00.000Z");
    assert.equal(date("-2026-09-01T00:00:00.000Z").value, "-2026-09-01T00:00:00.000Z");
  });

  test("date rejects a date without a time or without a zone", () => {
    assert.equal(
      errorCode(() => date("2026-09-01")),
      "LITERAL_PRECISION",
    );
    assert.equal(
      errorCode(() => date("2026-09-01T00:00:00.000")),
      "LITERAL_PRECISION",
    );
    assert.equal(
      errorCode(() => date(new Date("nope"))),
      "LITERAL_PRECISION",
    );
  });

  // Checked against jackrabbit-jcr-commons 2.22.0-jahia1: ValueFactoryImpl.createValue(s, DATE)
  // throws ValueFormatException on each of these, because ISO8601.parse reads fixed offsets.
  test("date rejects the ISO 8601 forms that Jackrabbit does not parse", () => {
    assert.equal(
      errorCode(() => date("2026-09-01T00:00:00Z")),
      "LITERAL_PRECISION",
    );
    assert.equal(
      errorCode(() => date("2026-09-01T00:00:00.1+02:00")),
      "LITERAL_PRECISION",
    );
    assert.equal(
      errorCode(() => date("2026-09-01T00:00:00.123456789Z")),
      "LITERAL_PRECISION",
    );
    assert.equal(
      errorCode(() => date("12026-09-01T00:00:00.000Z")),
      "LITERAL_PRECISION",
    );
  });

  test("date rejects a Date whose year needs the expanded form", () => {
    assert.equal(
      errorCode(() => date(new Date(Date.UTC(275760, 8, 13)))),
      "LITERAL_PRECISION",
    );
  });

  test("name takes a JCR name and rejects anything else", () => {
    assert.deepEqual(name("jnt:page"), { kind: "Literal", type: "Name", value: "jnt:page" });
    assert.equal(
      errorCode(() => name("a/b")),
      "INVALID_NAME",
    );
  });

  test("path takes an absolute or a relative JCR path", () => {
    assert.deepEqual(path("/sites/acme"), { kind: "Literal", type: "Path", value: "/sites/acme" });
    assert.equal(path(".").value, ".");
    assert.equal(
      errorCode(() => path("/sites//acme")),
      "INVALID_PATH",
    );
  });

  test("reference and weakReference carry an identifier", () => {
    assert.deepEqual(reference("6f0c4d4e"), {
      kind: "Literal",
      type: "Reference",
      value: "6f0c4d4e",
    });
    assert.equal(weakReference("6f0c4d4e").type, "WeakReference");
    assert.equal(
      errorCode(() => reference("")),
      "LITERAL_PRECISION",
    );
  });

  test("uri carries a URI", () => {
    assert.deepEqual(uri("https://jahia.com"), {
      kind: "Literal",
      type: "URI",
      value: "https://jahia.com",
    });
    assert.equal(
      errorCode(() => uri("")),
      "LITERAL_PRECISION",
    );
  });
});

describe("bind variables", () => {
  test("bindVariable builds a named placeholder", () => {
    assert.deepEqual(bindVariable("since"), {
      kind: "BindVariableValue",
      bindVariableName: "since",
    });
  });

  test("$ is the short form", () => {
    assert.deepEqual($("since"), bindVariable("since"));
  });

  test("a name that the Parser cannot read throws INVALID_NAME", () => {
    assert.equal(
      errorCode(() => $("1since")),
      "INVALID_NAME",
    );
    assert.equal(
      errorCode(() => $("jcr:since")),
      "INVALID_NAME",
    );
    assert.equal(
      errorCode(() => $("")),
      "INVALID_NAME",
    );
  });
});

describe("QueryError", () => {
  test("it carries a code and a path into the model", () => {
    let caught: unknown;
    try {
      long(4.5);
    } catch (error) {
      caught = error;
    }

    assert.equal(caught instanceof QueryError, true);
    assert.equal(caught instanceof Error, true);

    const error = caught as QueryError;
    assert.equal(error.name, "QueryError");
    assert.equal(error.code, "LITERAL_PRECISION");
    assert.equal(error.at, "long");
    assert.equal(error.statement, undefined);
  });
});
