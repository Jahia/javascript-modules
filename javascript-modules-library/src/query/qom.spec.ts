import assert from "node:assert/strict";
import test, { describe } from "node:test";
import type { JCRSessionWrapper } from "org.jahia.services.content";
import { from } from "./builder.js";
import { JoinType, Operator } from "./constants.js";
import { qom } from "./factory.js";
import {
  $,
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
import type { Literal } from "./model.js";
import { toQOM } from "./qom.js";
import { QueryError } from "./validate.js";

/**
 * The sink is tested against a fake factory and a fake value factory that record every call. What
 * matters is the call order of the post-order walk, the explicit nulls, the `PropertyType` code of
 * each literal, and that a bind variable never reaches the host as a variable.
 */

interface Call {
  readonly method: string;
  readonly args: readonly unknown[];
}

/**
 * A stand-in for any host object: it records the method name and the arguments, and returns a
 * marker.
 */
function recordingObject(calls: Call[], prefix: string): Record<string, unknown> {
  return new Proxy(
    {},
    {
      get(_target, property) {
        const method = String(property);
        return (...args: unknown[]) => {
          calls.push({ method: `${prefix}${method}`, args });
          return { node: method, args };
        };
      },
    },
  ) as Record<string, unknown>;
}

function lab() {
  const calls: Call[] = [];
  const factory = recordingObject(calls, "");
  const values = recordingObject(calls, "");
  const session = {
    getWorkspace: () => ({ getQueryManager: () => ({ getQOMFactory: () => factory }) }),
    getValueFactory: () => values,
  } as unknown as JCRSessionWrapper;

  return {
    calls,
    session,
    methods: () => calls.map((call) => call.method),
    argsOf: (method: string) => calls.filter((call) => call.method === method).map((c) => c.args),
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

/** Builds a one-comparison model whose static operand is the given literal. */
function withLiteral(value: Literal) {
  return qom.createQuery(
    qom.selector("jnt:page", "p"),
    qom.comparison(qom.propertyValue("p", "prop"), Operator.EQUAL_TO, value),
  );
}

describe("toQOM, walk order", () => {
  test("it builds every child before the node that holds it", () => {
    const { session, methods } = lab();
    toQOM(
      from("jnt:page", "p")
        .where(({ p }) => p.prop("jcr:title").eq("Home"))
        .limit(10).model,
      session,
    );

    assert.deepEqual(methods(), [
      "selector",
      "propertyValue",
      "createValue",
      "literal",
      "comparison",
      "column",
      "createQuery",
    ]);
  });

  test("it passes the source, the constraint, the orderings and the columns to createQuery", () => {
    const { session, firstArgs } = lab();
    toQOM(
      from("jnt:page", "p")
        .where(({ p }) => p.prop("jcr:title").eq("Home"))
        .orderBy(({ p }) => p.prop("jcr:lastModified").desc()).model,
      session,
    );

    const args = firstArgs("createQuery");
    assert.equal((args?.[0] as { node: string }).node, "selector");
    assert.equal((args?.[1] as { node: string }).node, "comparison");
    assert.equal((args?.[2] as unknown[]).length, 1);
    assert.equal((args?.[3] as unknown[]).length, 1);
  });

  test("it builds the two sides of a join before the condition and the join", () => {
    const { session, methods } = lab();
    toQOM(
      from("jnt:page", "p")
        .joinSlow("jnt:content", "c")
        .on(({ c, p }) => c.isChildOf(p)).model,
      session,
    );

    assert.deepEqual(methods(), [
      "selector",
      "selector",
      "childNodeJoinCondition",
      "join",
      "column",
      "column",
      "createQuery",
    ]);
  });

  test("it builds a nested case transform from the inside out", () => {
    const { session, methods } = lab();
    toQOM(
      qom.createQuery(qom.selector("jnt:page", "p"), null, [
        qom.descendingSlow(qom.lowerCase(qom.upperCase(qom.propertyValue("p", "jcr:title")))),
      ]),
      session,
    );

    assert.deepEqual(methods(), [
      "selector",
      "propertyValue",
      "upperCase",
      "lowerCase",
      "descending",
      "column",
      "createQuery",
    ]);
  });

  test("it builds the property value a LENGTH holds before the LENGTH", () => {
    const { session, methods } = lab();
    toQOM(
      from("jnt:page", "p").whereSlow(({ p }) => p.prop("jcr:title").lengthSlow().gtSlow(3)).model,
      session,
    );

    assert.deepEqual(methods().slice(0, 3), ["selector", "propertyValue", "length"]);
  });
});

describe("toQOM, explicit nulls", () => {
  test("a query without a constraint passes null to createQuery", () => {
    const { session, firstArgs } = lab();
    toQOM(from("jnt:page", "p").model, session);
    assert.equal(firstArgs("createQuery")?.[1], null);
  });

  test("an empty column list becomes one wildcard column per selector, in source order", () => {
    const { session, argsOf } = lab();
    toQOM(
      from("jnt:page", "p")
        .joinSlow("jnt:content", "c")
        .on(({ c, p }) => c.isChildOf(p)).model,
      session,
    );

    assert.deepEqual(argsOf("column"), [
      ["p", null, null],
      ["c", null, null],
    ]);
  });

  test("a wildcard column of the model keeps its two null slots", () => {
    const { session, argsOf } = lab();
    toQOM(from("jnt:page", "p").select(({ p }) => p.all()).model, session);
    assert.deepEqual(argsOf("column"), [["p", null, null]]);
  });

  test("a column without an alias passes a null column name", () => {
    const { session, argsOf } = lab();
    toQOM(
      from("jnt:page", "p").select(
        ({ p }) => p.prop("jcr:title").as(),
        ({ p }) => p.prop("jcr:title").as("title"),
      ).model,
      session,
    );

    assert.deepEqual(argsOf("column"), [
      ["p", "jcr:title", null],
      ["p", "jcr:title", "title"],
    ]);
  });

  test("a full text search over every property passes a null property name", () => {
    const { session, firstArgs } = lab();
    toQOM(from("jnt:article", "a").where(({ a }) => a.fullText("graal*")).model, session);
    const args = firstArgs("fullTextSearch");
    assert.equal(args?.[0], "a");
    assert.equal(args?.[1], null);
    assert.equal((args?.[2] as { node: string }).node, "literal");
  });

  test("a full text search over one property keeps that name", () => {
    const { session, firstArgs } = lab();
    toQOM(
      from("jnt:article", "a").where(({ a }) => a.prop("body").fullText("graal*")).model,
      session,
    );
    assert.equal(firstArgs("fullTextSearch")?.[1], "body");
  });
});

describe("toQOM, literals", () => {
  test("each literal type travels as its string form with its PropertyType code", () => {
    const cases: [Literal, string, number][] = [
      [literal("Home"), "Home", 1],
      [long(42), "42", 3],
      [double(1.5), "1.5", 4],
      [date("2026-09-01T00:00:00.000+02:00"), "2026-09-01T00:00:00.000+02:00", 5],
      [literal(true), "true", 6],
      [name("jnt:page"), "jnt:page", 7],
      [path("/sites/acme"), "/sites/acme", 8],
      [reference("8a0d1f"), "8a0d1f", 9],
      [weakReference("8a0d1f"), "8a0d1f", 10],
      [uri("https://jahia.com"), "https://jahia.com", 11],
      [decimal("1.50"), "1.50", 12],
    ];

    for (const [value, text, code] of cases) {
      const { session, firstArgs } = lab();
      toQOM(withLiteral(value), session);
      assert.deepEqual(firstArgs("createValue"), [text, code], `literal type ${value.type}`);
    }
  });

  test("the value the factory returns is what literal() receives", () => {
    const { session, firstArgs } = lab();
    toQOM(withLiteral(literal("Home")), session);
    assert.deepEqual(firstArgs("literal"), [{ node: "createValue", args: ["Home", 1] }]);
  });
});

describe("toQOM, bind variables", () => {
  const upcoming = from("jnt:event", "e")
    .where(({ e }) => e.prop("startDate").ge($("since")))
    .limit(5);

  test("a bound variable is inlined as a typed literal, and never reaches the host", () => {
    const { session, methods, firstArgs } = lab();
    toQOM(upcoming.model, session, { since: date("2026-09-01T00:00:00.000+02:00") });

    assert.equal(methods().includes("bindVariable"), false);
    assert.deepEqual(firstArgs("createValue"), ["2026-09-01T00:00:00.000+02:00", 5]);
  });

  test("a bound JavaScript value is inferred, as literal() infers it", () => {
    const { session, firstArgs } = lab();
    toQOM(upcoming.model, session, { since: 42 });
    assert.deepEqual(firstArgs("createValue"), ["42", 3]);
  });

  test("a missing binding throws UNBOUND_VARIABLE before any host call", () => {
    const { session, calls } = lab();
    const error = caught(() => toQOM(upcoming.model, session));

    assert.equal(error?.code, "UNBOUND_VARIABLE");
    assert.equal(error?.at, "constraint.operand2");
    assert.deepEqual(calls, []);
  });

  test("a missing binding inside a full text search is found too", () => {
    const { session, calls } = lab();
    const error = caught(() =>
      toQOM(from("jnt:article", "a").where(({ a }) => a.fullText($("words"))).model, session),
    );

    assert.equal(error?.code, "UNBOUND_VARIABLE");
    assert.equal(error?.at, "constraint.fullTextSearchExpression");
    assert.deepEqual(calls, []);
  });

  test("a missing binding nested under and, or and not is found too", () => {
    const { session } = lab();
    const error = caught(() =>
      toQOM(
        from("jnt:page", "p")
          .where(({ p }) => p.prop("a").eq(1))
          .where(({ p }) => p.prop("b").eq($("b"))).model,
        session,
        {},
      ),
    );

    assert.equal(error?.code, "UNBOUND_VARIABLE");
    assert.equal(error?.at, "constraint.constraint2.operand2");
  });
});

describe("toQOM, every construct", () => {
  test("the three node operands reach their factory method", () => {
    const { session, methods } = lab();
    toQOM(
      qom.createQuery(
        qom.selector("jnt:page", "p"),
        qom.and(
          qom.comparisonSlow(qom.nodeName("p"), Operator.EQUAL_TO, literal("home")),
          qom.comparisonSlow(qom.nodeLocalName("p"), Operator.LIKE, literal("home%")),
        ),
        [qom.descending(qom.fullTextSearchScore("p"))],
      ),
      session,
    );

    assert.deepEqual(methods(), [
      "selector",
      "nodeName",
      "createValue",
      "literal",
      "comparison",
      "nodeLocalName",
      "createValue",
      "literal",
      "comparison",
      "and",
      "fullTextSearchScore",
      "descending",
      "column",
      "createQuery",
    ]);
  });

  test("the path constraints reach their factory method with the model's path", () => {
    const { session, firstArgs } = lab();
    toQOM(
      qom.createQuery(
        qom.selector("jnt:news", "n"),
        qom.or(
          qom.descendantNode("n", "/sites/acme/contents"),
          qom.or(qom.childNode("n", "/sites/acme"), qom.sameNode("n", "/sites/acme/home")),
        ),
      ),
      session,
    );

    assert.deepEqual(firstArgs("descendantNode"), ["n", "/sites/acme/contents"]);
    assert.deepEqual(firstArgs("childNode"), ["n", "/sites/acme"]);
    assert.deepEqual(firstArgs("sameNode"), ["n", "/sites/acme/home"]);
  });

  test("property existence and not reach their factory method", () => {
    const { session, methods, firstArgs } = lab();
    toQOM(
      from("jnt:page", "p").where(({ p }) => qom.not(p.prop("jcr:title").exists())).model,
      session,
    );

    assert.deepEqual(methods().slice(1, 3), ["propertyExistence", "not"]);
    assert.deepEqual(firstArgs("propertyExistence"), ["p", "jcr:title"]);
  });

  test("the four join conditions reach their factory method with the Java argument order", () => {
    const equi = lab();
    toQOM(
      qom.createQuery(
        qom.joinSlow(
          qom.selector("jnt:page", "p"),
          qom.selector("jnt:content", "c"),
          JoinType.INNER,
          qom.equiJoinCondition("p", "jcr:uuid", "c", "j:parent"),
        ),
      ),
      equi.session,
    );
    assert.deepEqual(equi.firstArgs("equiJoinCondition"), ["p", "jcr:uuid", "c", "j:parent"]);

    const same = lab();
    toQOM(
      qom.createQuery(
        qom.joinSlow(
          qom.selector("jnt:page", "p"),
          qom.selector("jnt:content", "c"),
          JoinType.LEFT_OUTER,
          qom.sameNodeJoinCondition("p", "c"),
        ),
      ),
      same.session,
    );
    assert.deepEqual(same.firstArgs("sameNodeJoinCondition"), ["p", "c", "."]);
    assert.equal(same.firstArgs("join")?.[2], JoinType.LEFT_OUTER);

    const descendant = lab();
    toQOM(
      qom.createQuery(
        qom.joinSlow(
          qom.selector("jnt:page", "p"),
          qom.selector("jnt:content", "c"),
          JoinType.INNER,
          qom.descendantNodeJoinCondition("c", "p"),
        ),
      ),
      descendant.session,
    );
    assert.deepEqual(descendant.firstArgs("descendantNodeJoinCondition"), ["c", "p"]);
  });

  test("an ascending ordering and a descending ordering reach different methods", () => {
    const ascending = lab();
    toQOM(
      from("jnt:page", "p").orderBy(({ p }) => p.prop("jcr:title").asc()).model,
      ascending.session,
    );
    assert.equal(ascending.methods().includes("ascending"), true);

    const descending = lab();
    toQOM(
      from("jnt:page", "p").orderBy(({ p }) => p.prop("jcr:title").desc()).model,
      descending.session,
    );
    assert.equal(descending.methods().includes("descending"), true);
  });

  test("the operator travels as the wire constant", () => {
    const { session, firstArgs } = lab();
    toQOM(from("jnt:page", "p").where(({ p }) => p.prop("jcr:title").like("A%")).model, session);
    assert.equal(firstArgs("comparison")?.[1], Operator.LIKE);
  });
});

describe("toQOM, validation", () => {
  test("it runs the cross-node checks before any host call", () => {
    const { session, calls } = lab();
    const foreign = qom.createQuery(
      qom.selector("jnt:page", "p"),
      qom.propertyExistence("q", "jcr:title"),
    );

    assert.equal(caught(() => toQOM(foreign, session))?.code, "UNDECLARED_SELECTOR");
    assert.deepEqual(calls, []);
  });

  test("it reports a node kind no branch handles", () => {
    const { session } = lab();
    const broken = {
      kind: "QueryObjectModel",
      source: { kind: "Nonsense", selectorName: "p" },
      constraint: null,
      orderings: [],
      columns: [],
    };

    assert.equal(
      caught(() => toQOM(broken as unknown as Parameters<typeof toQOM>[0], session))?.code,
      "UNSUPPORTED",
    );
  });
});
