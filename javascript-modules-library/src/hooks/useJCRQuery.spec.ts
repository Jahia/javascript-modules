import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { from } from "../query/builder.js";
import { QueryError } from "../query/validate.js";
import { useJCRQuery as useJCRQueryAtRuntime } from "./useJCRQuery.js";

/**
 * The hook needs a React render context for everything it does with a session, so the overloads are
 * checked at compile time. The one runtime check below is the refusal of the deprecated form, which
 * happens before the session is read and therefore needs no context.
 */
declare const useJCRQuery: typeof import("./useJCRQuery.js").useJCRQuery;

export function overloadFixtures(): void {
  const statement = "SELECT * FROM [jnt:page]";
  const builder = from("jnt:page", "p").limit(10);

  // The deprecated form, which now throws because it carries no limit.
  useJCRQuery({ query: statement });

  // The recommended string form.
  useJCRQuery({ query: statement, limit: 10 });
  useJCRQuery({ query: statement, limit: 10, offset: 20 });

  // The built form, which carries its own limit, offset and bind values.
  useJCRQuery({ query: builder });
  useJCRQuery({ query: builder.offset(20).bind({ since: 1 }) });

  // @ts-expect-error the recommended string form needs a limit next to the offset
  useJCRQuery({ query: statement, offset: 20 });

  // @ts-expect-error the built form takes no limit, because the query carries one
  useJCRQuery({ query: builder, limit: 10 });

  // @ts-expect-error the built form takes no offset, because the query carries one
  useJCRQuery({ query: builder, offset: 20 });

  // @ts-expect-error a query whose limit was not set is not executable
  useJCRQuery({ query: from("jnt:page", "p") });

  // @ts-expect-error the query is required
  useJCRQuery({});
}

describe("useJCRQuery type fixtures", () => {
  test("they compile, which is the assertion", () => {
    assert.equal(typeof overloadFixtures, "function");
  });
});

describe("useJCRQuery, the deprecated statement form", () => {
  test("a statement with no limit is refused before the session is read", () => {
    assert.throws(
      () => useJCRQueryAtRuntime({ query: "SELECT * FROM [jnt:page]" }),
      (error: unknown) =>
        error instanceof QueryError &&
        error.code === "UNSUPPORTED" &&
        error.at === "execution.limit",
    );
  });

  test("a statement with an explicit -1 is not refused, because the caller asked for it", () => {
    // It gets past the limit check and fails on the missing render context instead, which is what
    // this assertion reads: the refusal is no longer a `QueryError`.
    assert.throws(
      () => useJCRQueryAtRuntime({ query: "SELECT * FROM [jnt:page]", limit: -1 }),
      (error: unknown) => !(error instanceof QueryError),
    );
  });
});
