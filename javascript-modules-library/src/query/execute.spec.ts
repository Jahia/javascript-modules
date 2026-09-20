import assert from "node:assert/strict";
import test, { describe } from "node:test";
import type { JCRSessionWrapper } from "org.jahia.services.content";
import { from, not } from "./builder.js";
import { executeQuery } from "./execute.js";
import { $ } from "./literal.js";
import { QueryError } from "./validate.js";

/**
 * The execution entry is tested against a fake session. What matters is that it is the only caller
 * of `setLimit` and `setOffset`, that both values reach the host once and only once, and that a
 * query that cannot run is refused before the first host call.
 */

interface Call {
  readonly method: string;
  readonly args: readonly unknown[];
}

function lab() {
  const calls: Call[] = [];
  const result = { getNodes: () => ({}), getRows: () => ({}) };

  const prepared = {
    setLimit(limit: number) {
      calls.push({ method: "setLimit", args: [limit] });
    },
    setOffset(offset: number) {
      calls.push({ method: "setOffset", args: [offset] });
    },
    getStatement() {
      calls.push({ method: "getStatement", args: [] });
      return "SELECT * FROM [jnt:page] AS p";
    },
    execute() {
      calls.push({ method: "execute", args: [] });
      return result;
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
    result,
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

/** Runs the callback with `console.debug` captured, and returns what it wrote. */
function captureDebug(run: () => void): string[] {
  const written: string[] = [];
  const original = console.debug;
  console.debug = (...args: unknown[]) => {
    written.push(args.map(String).join(" "));
  };

  try {
    run();
  } finally {
    console.debug = original;
  }

  return written;
}

describe("executeQuery, a JCR-SQL2 statement", () => {
  test("it creates the query in JCR-SQL2 and applies the limit and the offset before execute", () => {
    const { session, methods, firstArgs } = lab();
    executeQuery(session, "SELECT * FROM [jnt:page]", { limit: 10, offset: 20 });

    assert.deepEqual(methods(), ["manager.createQuery", "setLimit", "setOffset", "execute"]);
    assert.deepEqual(firstArgs("manager.createQuery"), ["SELECT * FROM [jnt:page]", "JCR-SQL2"]);
    assert.deepEqual(firstArgs("setLimit"), [10]);
    assert.deepEqual(firstArgs("setOffset"), [20]);
  });

  test("a limit of -1 runs unbounded, so setLimit is never called", () => {
    const { session, methods } = lab();
    executeQuery(session, "SELECT * FROM [jnt:page]", { limit: -1 });
    assert.deepEqual(methods(), ["manager.createQuery", "execute"]);
  });

  test("an offset of zero and a missing offset both skip setOffset", () => {
    const zero = lab();
    executeQuery(zero.session, "SELECT * FROM [jnt:page]", { limit: 10, offset: 0 });
    assert.equal(zero.methods().includes("setOffset"), false);

    const missing = lab();
    executeQuery(missing.session, "SELECT * FROM [jnt:page]", { limit: 10 });
    assert.equal(missing.methods().includes("setOffset"), false);
  });

  test("it returns what the host returned", () => {
    const { session, result } = lab();
    assert.equal(executeQuery(session, "SELECT * FROM [jnt:page]", { limit: 10 }), result);
  });

  test("it logs nothing, because the caller already holds the statement it passed", () => {
    const { session } = lab();
    const written = captureDebug(() => {
      executeQuery(session, "SELECT * FROM [jnt:page]", { limit: 10 });
    });

    assert.deepEqual(written, []);
  });
});

describe("executeQuery, a built query", () => {
  test("it goes through the object model factory and reads the values the query carries", () => {
    const { session, methods, firstArgs } = lab();
    executeQuery(session, from("jnt:page", "p").limit(10).offset(20));

    assert.deepEqual(methods(), [
      "factory.selector",
      "factory.column",
      "factory.createQuery",
      "getStatement",
      "setLimit",
      "setOffset",
      "execute",
    ]);
    assert.deepEqual(firstArgs("setLimit"), [10]);
    assert.deepEqual(firstArgs("setOffset"), [20]);
  });

  test("unboundedSlow carries -1, so setLimit is never called", () => {
    const { session, methods } = lab();
    executeQuery(session, from("jnt:page", "p").unboundedSlow());
    assert.equal(methods().includes("setLimit"), false);
  });

  test("it logs the statement the host formatted, at debug level", () => {
    const { session } = lab();
    const written = captureDebug(() => {
      executeQuery(session, from("jnt:page", "p").limit(10));
    });

    assert.deepEqual(written, ["Running JCR query: SELECT * FROM [jnt:page] AS p"]);
  });

  test("it hands the bound values to the sink", () => {
    const { session, calls } = lab();
    executeQuery(
      session,
      from("jnt:event", "e")
        .where(({ e }) => e.prop("startDate").ge($("since")))
        .limit(5)
        .bind({ since: 42 }),
    );

    assert.deepEqual(calls.find((call) => call.method === "factory.literal")?.args, [
      { value: "42", type: 3 },
    ]);
  });

  test("an unbound variable is refused before any host call", () => {
    const { session, calls } = lab();
    const error = caught(() =>
      executeQuery(
        session,
        from("jnt:event", "e")
          .where(({ e }) => e.prop("startDate").ge($("since")))
          .limit(5),
      ),
    );

    assert.equal(error?.code, "UNBOUND_VARIABLE");
    assert.deepEqual(calls, []);
  });
});

describe("executeQuery, conflicts and refusals", () => {
  test("a carried limit and a passed limit throw LIMIT_CONFLICT before any host call", () => {
    const { session, calls } = lab();
    const error = caught(() =>
      executeQuery(session, from("jnt:page", "p").limit(10), { limit: 20 }),
    );

    assert.equal(error?.code, "LIMIT_CONFLICT");
    assert.equal(error?.at, "execution.limit");
    assert.deepEqual(calls, []);
  });

  test("a carried offset and a passed offset throw LIMIT_CONFLICT", () => {
    const { session } = lab();
    const error = caught(() =>
      executeQuery(session, from("jnt:page", "p").limit(10).offset(20), { offset: 30 }),
    );

    assert.equal(error?.code, "LIMIT_CONFLICT");
    assert.equal(error?.at, "execution.offset");
  });

  test("a passed offset is used when the query carries none", () => {
    const { session, firstArgs } = lab();
    executeQuery(session, from("jnt:page", "p").limit(10), { offset: 30 });
    assert.deepEqual(firstArgs("setOffset"), [30]);
  });

  test("a NOT and an UPPER around a property reach the host, because the failure is conditional", () => {
    const negated = lab();
    executeQuery(
      negated.session,
      from("jnt:page", "p")
        .where(({ p }) => not(p.prop("j:published").eq(true)))
        .limit(10),
    );
    assert.equal(negated.methods().includes("factory.not"), true);
    assert.equal(negated.methods().includes("execute"), true);

    const upperCased = lab();
    executeQuery(
      upperCased.session,
      from("jnt:page", "p")
        .where(({ p }) => p.prop("jcr:title").upper().eq("HOME"))
        .limit(10),
    );
    assert.equal(upperCased.methods().includes("factory.upperCase"), true);
    assert.equal(upperCased.methods().includes("execute"), true);
  });

  test("a query whose diagnostic level is none throws UNSUPPORTED before any host call", () => {
    const { session, calls } = lab();
    const error = caught(() =>
      executeQuery(
        session,
        from("jnt:page", "p")
          .whereSlow(({ p }) => p.name().likeSlow("home%"))
          .limit(10),
      ),
    );

    assert.equal(error?.code, "UNSUPPORTED");
    assert.deepEqual(calls, []);
  });
});
