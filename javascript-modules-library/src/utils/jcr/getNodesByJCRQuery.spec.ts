import assert from "node:assert/strict";
import test, { describe } from "node:test";
import type { JCRSessionWrapper } from "org.jahia.services.content";
import { from } from "../../query/builder.js";
import type { Executable } from "../../query/builder.js";
import { QueryError } from "../../query/validate.js";
import { getNodesByJCRQuery } from "./getNodesByJCRQuery.js";

/**
 * The seam is tested against a fake session. What matters is that a statement keeps the behaviour
 * every current caller relies on, that a built query carries its own values instead, and that the
 * two are never mixed.
 */

interface Call {
  readonly method: string;
  readonly args: readonly unknown[];
}

function lab(nodes: readonly string[] = []) {
  const calls: Call[] = [];

  const prepared = {
    setLimit(limit: number) {
      calls.push({ method: "setLimit", args: [limit] });
    },
    setOffset(offset: number) {
      calls.push({ method: "setOffset", args: [offset] });
    },
    getStatement() {
      return "SELECT * FROM [jnt:page] AS p";
    },
    execute() {
      calls.push({ method: "execute", args: [] });
      let index = 0;
      return {
        getNodes: () => ({
          hasNext: () => index < nodes.length,
          nextNode: () => nodes[index++],
        }),
        getRows: () => ({}),
      };
    },
  };

  const factory = new Proxy(
    {},
    {
      get(_target, property) {
        const method = String(property);
        return (...args: unknown[]) => {
          calls.push({ method: `factory.${method}`, args });
          return method === "createQuery" ? prepared : { node: method, args };
        };
      },
    },
  );

  const session = {
    getWorkspace: () => ({
      getQueryManager: () => ({
        createQuery: (statement: string, language: string) => {
          calls.push({ method: "manager.createQuery", args: [statement, language] });
          return prepared;
        },
        getQOMFactory: () => factory,
      }),
    }),
    getValueFactory: () => ({
      createValue: (value: unknown, type: unknown) => ({ value, type }),
    }),
  } as unknown as JCRSessionWrapper;

  return {
    calls,
    session,
    methods: () => calls.map((call) => call.method),
    firstArgs: (method: string) => calls.find((call) => call.method === method)?.args,
  };
}

function caught(run: () => unknown): QueryError | undefined {
  try {
    run();
    return undefined;
  } catch (error) {
    return error instanceof QueryError ? error : undefined;
  }
}

/** Runs the callback with `console.warn` captured, and returns what it wrote. */
function captureWarn(run: () => unknown): { written: string[]; returned: unknown } {
  const written: string[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => {
    written.push(args.map(String).join(" "));
  };

  try {
    return { written, returned: run() };
  } finally {
    console.warn = original;
  }
}

describe("getNodesByJCRQuery, a JCR-SQL2 statement", () => {
  test("it keeps the falsy limit guard, and runs nothing", () => {
    const { session, calls } = lab();
    const { written, returned } = captureWarn(() =>
      getNodesByJCRQuery(session, "SELECT * FROM [jnt:page]"),
    );

    assert.deepEqual(returned, []);
    assert.deepEqual(calls, []);
    assert.equal(written.length, 1);
    assert.match(written[0], /^Missing one or more mandatory parameters/);
  });

  test("a missing session and an empty statement are guarded too", () => {
    const { session } = lab();
    assert.deepEqual(captureWarn(() => getNodesByJCRQuery(session, "", 10)).returned, []);
    assert.deepEqual(
      captureWarn(() =>
        getNodesByJCRQuery(
          undefined as unknown as JCRSessionWrapper,
          "SELECT * FROM [jnt:page]",
          10,
        ),
      ).returned,
      [],
    );
  });

  test("it collects every node of the result", () => {
    const { session } = lab(["one", "two", "three"]);
    assert.deepEqual(getNodesByJCRQuery(session, "SELECT * FROM [jnt:page]", 10), [
      "one",
      "two",
      "three",
    ]);
  });

  test("it applies the limit and the offset", () => {
    const { session, methods, firstArgs } = lab();
    getNodesByJCRQuery(session, "SELECT * FROM [jnt:page]", 10, 20);

    assert.deepEqual(methods(), ["manager.createQuery", "setLimit", "setOffset", "execute"]);
    assert.deepEqual(firstArgs("setLimit"), [10]);
    assert.deepEqual(firstArgs("setOffset"), [20]);
  });

  test("a limit of -1 returns every node, so setLimit is never called", () => {
    const { session, methods } = lab();
    getNodesByJCRQuery(session, "SELECT * FROM [jnt:page]", -1);
    assert.deepEqual(methods(), ["manager.createQuery", "execute"]);
  });
});

describe("getNodesByJCRQuery, a built query", () => {
  test("it goes through the object model factory and reads the carried values", () => {
    const { session, methods, firstArgs } = lab(["one"]);
    const nodes = getNodesByJCRQuery(session, from("jnt:page").limit(10).offset(20));

    assert.deepEqual(nodes, ["one"]);
    assert.deepEqual(methods(), [
      "factory.selector",
      "factory.column",
      "factory.createQuery",
      "setLimit",
      "setOffset",
      "execute",
    ]);
    assert.deepEqual(firstArgs("setLimit"), [10]);
    assert.deepEqual(firstArgs("setOffset"), [20]);
  });

  test("it needs no positional limit, so the falsy limit guard does not apply", () => {
    const { session } = lab(["one"]);
    assert.deepEqual(getNodesByJCRQuery(session, from("jnt:page").limit(10)), ["one"]);
  });

  test("a builder with no limit throws UNSUPPORTED, whatever the caller's language", () => {
    const { session, calls } = lab();
    // What a `.jsx` module reaches the seam with, because it never sees the type state.
    const unbounded = from("jnt:page") as unknown as Executable<"jnt:page">;
    const error = caught(() => getNodesByJCRQuery(session, unbounded));

    assert.equal(error?.code, "UNSUPPORTED");
    assert.equal(error?.at, "execution.limit");
    assert.deepEqual(calls, []);
  });

  test("a positional limit next to the carried one throws LIMIT_CONFLICT", () => {
    const { session, calls } = lab();
    const error = caught(() => getNodesByJCRQuery(session, from("jnt:page").limit(10), 20));

    assert.equal(error?.code, "LIMIT_CONFLICT");
    assert.deepEqual(calls, []);
  });

  test("a positional offset next to the carried one throws LIMIT_CONFLICT", () => {
    const { session } = lab();
    const error = caught(() =>
      getNodesByJCRQuery(session, from("jnt:page").limit(10).offset(20), undefined, 30),
    );

    assert.equal(error?.code, "LIMIT_CONFLICT");
    assert.equal(error?.at, "execution.offset");
  });

  test("a positional offset of zero next to the carried one throws too", () => {
    const { session } = lab();
    const error = caught(() =>
      getNodesByJCRQuery(session, from("jnt:page").limit(10).offset(20), undefined, 0),
    );

    assert.equal(error?.code, "LIMIT_CONFLICT");
    assert.equal(error?.at, "execution.offset");
  });

  test("an omitted offset leaves the carried one in place", () => {
    const { session, firstArgs } = lab();
    getNodesByJCRQuery(session, from("jnt:page").limit(10).offset(20));
    assert.deepEqual(firstArgs("setOffset"), [20]);
  });

  test("a missing session is guarded, and runs nothing", () => {
    const { calls } = lab();
    const { returned } = captureWarn(() =>
      getNodesByJCRQuery(undefined as unknown as JCRSessionWrapper, from("jnt:page").limit(10)),
    );

    assert.deepEqual(returned, []);
    assert.deepEqual(calls, []);
  });
});
