import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { from } from "../query/builder.js";

/**
 * The hook needs a React render context, so it is checked at compile time only. The three overload
 * signatures are what the checks below exercise, and the type of the hook is read without importing
 * it at run time, so this file stays free of React.
 */
declare const useJCRQuery: typeof import("./useJCRQuery.js").useJCRQuery;

export function overloadFixtures(): void {
  const statement = "SELECT * FROM [jnt:page]";
  const builder = from("jnt:page", "p").limit(10);

  // The deprecated form, which keeps -1 and returns every matching node.
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
