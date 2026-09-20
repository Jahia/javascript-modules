import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { and, from, not, or } from "./builder.js";
import type { Executable, Queryable } from "./builder.js";
import { JoinType, Operator } from "./constants.js";
import { qom } from "./factory.js";
import { $, date, literal, long } from "./literal.js";
import type { Constraint, Ordering } from "./model.js";
import { QueryError } from "./validate.js";

function errorCode(run: () => unknown): string | undefined {
  try {
    run();
    return undefined;
  } catch (error) {
    return error instanceof QueryError ? error.code : `not a QueryError: ${String(error)}`;
  }
}

const page = qom.selector("jnt:page", "p");
const title = qom.propertyValue("p", "jcr:title");

describe("from", () => {
  test("it starts an empty query over one node type under its alias", () => {
    assert.deepEqual(from("jnt:page", "p").model, qom.createQuery(page, null, [], []));
  });

  test("it carries no execution option before limit, offset or bind", () => {
    assert.deepEqual(from("jnt:page", "p").execution, {});
  });

  test("it lifts a model the factory built", () => {
    const model = qom.createQuery(page, qom.propertyExistence("p", "jcr:title"));
    const lifted = from(model);
    assert.deepEqual(lifted.model, model);
    assert.deepEqual(
      lifted.where(({ p }) => p.prop("j:published").eq(true)).model.constraint,
      qom.and(
        qom.propertyExistence("p", "jcr:title"),
        qom.comparison(qom.propertyValue("p", "j:published"), Operator.EQUAL_TO, literal(true)),
      ),
    );
  });

  test("it rejects a missing alias, which only a JavaScript caller can pass", () => {
    assert.equal(
      errorCode(() => (from as unknown as (nodeType: string) => unknown)("jnt:page")),
      "INVALID_NAME",
    );
  });

  test("it checks the node type name and the alias against the JCR name grammar", () => {
    assert.equal(
      errorCode(() => from("jnt page/x", "p")),
      "INVALID_NAME",
    );
    assert.equal(
      errorCode(() => from("jnt:page", "a|b")),
      "INVALID_NAME",
    );
  });
});

describe("where", () => {
  test("it builds the same model as the factory", () => {
    const built = from("jnt:page", "p").where(({ p }) => p.prop("jcr:title").eq("Home")).model;
    assert.deepEqual(
      built,
      qom.createQuery(page, qom.comparison(title, Operator.EQUAL_TO, literal("Home"))),
    );
  });

  test("it accepts a constraint that was built outside the callback", () => {
    const constraint: Constraint<"p", "fast"> = qom.comparison(
      title,
      Operator.EQUAL_TO,
      literal("Home"),
    );
    assert.deepEqual(from("jnt:page", "p").where(constraint).model.constraint, constraint);
  });

  test("repeated calls fold with AND, in call order", () => {
    const built = from("jnt:page", "p")
      .where(({ p }) => p.prop("jcr:title").eq("Home"))
      .where(({ p }) => p.prop("j:published").eq(true))
      .whereSlow(({ p }) => p.prop("jcr:title").lengthSlow().gtSlow(3)).model;

    assert.deepEqual(
      built.constraint,
      qom.and(
        qom.and(
          qom.comparison(title, Operator.EQUAL_TO, literal("Home")),
          qom.comparison(qom.propertyValue("p", "j:published"), Operator.EQUAL_TO, literal(true)),
        ),
        qom.comparisonSlow(qom.lengthSlow(title), Operator.GREATER_THAN, literal(3)),
      ),
    );
  });

  test("a path scope and a full text search take the plain names", () => {
    assert.deepEqual(
      from("jnt:news", "n").where(({ n }) => n.isDescendantOf("/sites/acme/contents")).model
        .constraint,
      qom.descendantNode("n", "/sites/acme/contents"),
    );
    assert.deepEqual(
      from("jnt:article", "a").where(({ a }) => a.contains("graal*")).model.constraint,
      qom.fullTextSearch("a", null, literal("graal*")),
    );
    assert.deepEqual(
      from("jnt:page", "p").where(({ p }) => p.isChildOf("/sites/acme")).model.constraint,
      qom.childNode("p", "/sites/acme"),
    );
    assert.deepEqual(
      from("jnt:page", "p").where(({ p }) => p.isSameAs("/sites/acme/home")).model.constraint,
      qom.sameNode("p", "/sites/acme/home"),
    );
  });

  test("a bind variable stays a bind variable in the model", () => {
    assert.deepEqual(
      from("jnt:event", "e").where(({ e }) => e.prop("startDate").ge($("since"))).model.constraint,
      qom.comparison(
        qom.propertyValue("e", "startDate"),
        Operator.GREATER_THAN_OR_EQUAL_TO,
        qom.bindVariable("since"),
      ),
    );
  });

  test("a typed literal survives unchanged", () => {
    const since = date("2026-09-01T00:00:00.000+02:00");
    assert.deepEqual(
      from("jnt:event", "e").where(({ e }) => e.prop("startDate").ge(since)).model.constraint,
      qom.comparison(qom.propertyValue("e", "startDate"), Operator.GREATER_THAN_OR_EQUAL_TO, since),
    );
  });
});

describe("the selector references", () => {
  test("the fast property comparisons map to the seven operators", () => {
    // The method name is read from a table, so the reference is indexed through a string. The
    // named calls elsewhere in this file are what keeps the compile time check on the names.
    const cases: [string, Operator][] = [
      ["eq", Operator.EQUAL_TO],
      ["ne", Operator.NOT_EQUAL_TO],
      ["lt", Operator.LESS_THAN],
      ["le", Operator.LESS_THAN_OR_EQUAL_TO],
      ["gt", Operator.GREATER_THAN],
      ["ge", Operator.GREATER_THAN_OR_EQUAL_TO],
      ["like", Operator.LIKE],
    ];

    for (const [method, operator] of cases) {
      const built = from("jnt:page", "p").where(({ p }) => {
        const reference = p.prop("jcr:title") as unknown as Record<
          string,
          (value: string) => Constraint<"p", "fast">
        >;
        return reference[method]("Home");
      }).model.constraint;
      assert.deepEqual(built, qom.comparison(title, operator, literal("Home")));
    }
  });

  test("exists, contains, asc and desc take the plain names", () => {
    assert.deepEqual(
      from("jnt:page", "p").where(({ p }) => p.prop("jcr:title").exists()).model.constraint,
      qom.propertyExistence("p", "jcr:title"),
    );
    assert.deepEqual(
      from("jnt:page", "p").where(({ p }) => p.prop("jcr:title").contains("home")).model.constraint,
      qom.fullTextSearch("p", "jcr:title", literal("home")),
    );
    assert.deepEqual(
      from("jnt:page", "p").orderBy(({ p }) => p.prop("date").asc()).model.orderings,
      [qom.ascending(qom.propertyValue("p", "date"))],
    );
    assert.deepEqual(
      from("jnt:page", "p").orderBy(({ p }) => p.prop("date").desc()).model.orderings,
      [qom.descending(qom.propertyValue("p", "date"))],
    );
  });

  test("the score reference sorts natively and compares in memory", () => {
    assert.deepEqual(
      from("jnt:article", "a").orderBy(({ a }) => a.score().desc()).model.orderings,
      [qom.descending(qom.fullTextSearchScore("a"))],
    );
    assert.deepEqual(
      from("jnt:article", "a").whereSlow(({ a }) => a.score().gtSlow(0.5)).model.constraint,
      qom.comparisonSlow(qom.fullTextSearchScore("a"), Operator.GREATER_THAN, literal(0.5)),
    );
  });

  test("the name references keep their index operators fast", () => {
    assert.deepEqual(
      from("jnt:page", "p").where(({ p }) => p.name().eq("home")).model.constraint,
      qom.comparison(qom.nodeName("p"), Operator.EQUAL_TO, literal("home")),
    );
    assert.deepEqual(
      from("jnt:page", "p").where(({ p }) => p.localName().like("home%")).model.constraint,
      qom.comparison(qom.nodeLocalName("p"), Operator.LIKE, literal("home%")),
    );
    assert.deepEqual(
      from("jnt:page", "p").whereSlow(({ p }) => p.name().likeSlow("home%")).model.constraint,
      qom.comparisonSlow(qom.nodeName("p"), Operator.LIKE, literal("home%")),
    );
  });

  test("a case transform compares fast and orders slow", () => {
    assert.deepEqual(
      from("jnt:page", "p").where(({ p }) => p.prop("jcr:title").lower().eq("home")).model
        .constraint,
      qom.comparison(qom.lowerCase(title), Operator.EQUAL_TO, literal("home")),
    );
    assert.deepEqual(
      from("jnt:page", "p").orderBySlow(({ p }) => p.prop("jcr:title").lower().descSlow()).model
        .orderings,
      [qom.descendingSlow(qom.lowerCase(title))],
    );
    assert.deepEqual(
      from("jnt:page", "p").where(({ p }) => p.prop("jcr:title").upper().eq("HOME")).model
        .constraint,
      qom.comparison(qom.upperCase(title), Operator.EQUAL_TO, literal("HOME")),
    );
  });

  test("the length reference carries no fast method and orders slow", () => {
    assert.deepEqual(
      from("jnt:page", "p").orderBySlow(({ p }) => p.prop("jcr:title").lengthSlow().ascSlow()).model
        .orderings,
      [qom.ascendingSlow(qom.lengthSlow(title))],
    );
  });

  test("all() and as() build the two column shapes", () => {
    assert.deepEqual(from("jnt:page", "p").select(({ p }) => p.all()).model.columns, [
      qom.column("p"),
    ]);
    assert.deepEqual(
      from("jnt:page", "p").select(({ p }) => p.prop("jcr:title").as("pageTitle")).model.columns,
      [qom.column("p", "jcr:title", "pageTitle")],
    );
    assert.deepEqual(
      from("jnt:page", "p").select(({ p }) => p.prop("jcr:title").as()).model.columns,
      [qom.column("p", "jcr:title")],
    );
  });

  test("columns() is the same call as select()", () => {
    assert.deepEqual(
      from("jnt:page", "p").columns(({ p }) => p.all()).model.columns,
      from("jnt:page", "p").select(({ p }) => p.all()).model.columns,
    );
  });

  test("repeated select calls append", () => {
    assert.deepEqual(
      from("jnt:page", "p")
        .select(({ p }) => p.all())
        .select(({ p }) => p.prop("jcr:title").as("t")).model.columns,
      [qom.column("p"), qom.column("p", "jcr:title", "t")],
    );
  });

  test("orderBy takes several orderings in one call, and appends across calls", () => {
    const built = from("jnt:news", "n")
      .orderBy(
        ({ n }) => n.prop("date").desc(),
        ({ n }) => n.prop("jcr:uuid").asc(),
      )
      .orderBy(({ n }) => n.prop("jcr:title").asc()).model.orderings;

    assert.deepEqual(built, [
      qom.descending(qom.propertyValue("n", "date")),
      qom.ascending(qom.propertyValue("n", "jcr:uuid")),
      qom.ascending(qom.propertyValue("n", "jcr:title")),
    ]);
  });
});

describe("and, or and not", () => {
  const published = qom.comparison(
    qom.propertyValue("p", "j:published"),
    Operator.EQUAL_TO,
    literal(true),
  );
  const home = qom.comparison(title, Operator.EQUAL_TO, literal("Home"));

  test("they fold left into the binary nodes of the model", () => {
    assert.deepEqual(and(home, published, home), qom.and(qom.and(home, published), home));
    assert.deepEqual(or(home, published, home), qom.or(qom.or(home, published), home));
    assert.deepEqual(not(home), qom.not(home));
  });

  test("one constraint folds to itself", () => {
    assert.deepEqual(and(home), home);
    assert.deepEqual(or(home), home);
  });

  test("no constraint throws NULL_CONSTRAINT", () => {
    assert.equal(
      errorCode(() => and()),
      "NULL_CONSTRAINT",
    );
    assert.equal(
      errorCode(() => or()),
      "NULL_CONSTRAINT",
    );
  });

  test("they mix the facade and the factory in one callback", () => {
    const built = from("jnt:page", "p").where(({ p }) =>
      and(
        not(p.prop("j:published").eq(true)),
        or(
          p.prop("jcr:title").like("A%"),
          qom.comparison(qom.lowerCase(title), Operator.EQUAL_TO, literal("home")),
        ),
      ),
    ).model.constraint;

    assert.deepEqual(
      built,
      qom.and(
        qom.not(published),
        qom.or(
          qom.comparison(title, Operator.LIKE, literal("A%")),
          qom.comparison(qom.lowerCase(title), Operator.EQUAL_TO, literal("home")),
        ),
      ),
    );
  });
});

describe("joinSlow", () => {
  test("it builds the join of example 7 of the plan", () => {
    const built = from("jnt:page", "p")
      .joinSlow("jnt:content", "c")
      .on(({ c, p }) => c.isChildOf(p))
      .where(({ c }) => c.prop("j:published").eq(true))
      .select(
        ({ p }) => p.all(),
        ({ c }) => c.prop("jcr:title").as("childTitle"),
      )
      .limit(20);

    assert.deepEqual(
      built.model,
      qom.createQuery(
        qom.joinSlow(
          page,
          qom.selector("jnt:content", "c"),
          JoinType.INNER,
          qom.childNodeJoinCondition("c", "p"),
        ),
        qom.comparison(qom.propertyValue("c", "j:published"), Operator.EQUAL_TO, literal(true)),
        [],
        [qom.column("p"), qom.column("c", "jcr:title", "childTitle")],
      ),
    );
    assert.deepEqual(built.execution, { limit: 20 });
  });

  test("it defaults to an inner join and takes an explicit join type", () => {
    const outer = from("jnt:page", "p")
      .joinSlow("jnt:content", "c", JoinType.LEFT_OUTER)
      .on(({ c, p }) => c.isDescendantOf(p)).model.source;
    assert.equal(outer.kind === "Join" && outer.joinType, JoinType.LEFT_OUTER);
  });

  test("the four join conditions are reachable from the references", () => {
    const sameNode = from("jnt:page", "p")
      .joinSlow("jnt:content", "c")
      .on(({ c, p }) => c.isSameAs(p, "child")).model.source;
    assert.deepEqual(
      sameNode.kind === "Join" && sameNode.joinCondition,
      qom.sameNodeJoinCondition("c", "p", "child"),
    );

    const equi = from("jnt:page", "p")
      .joinSlow("jnt:content", "c")
      .on(({ c, p }) => c.prop("j:parent").equals(p.prop("jcr:uuid"))).model.source;
    assert.deepEqual(
      equi.kind === "Join" && equi.joinCondition,
      qom.equiJoinCondition("c", "j:parent", "p", "jcr:uuid"),
    );

    const descendant = from("jnt:page", "p")
      .joinSlow("jnt:content", "c")
      .on(({ c, p }) => c.isDescendantOf(p)).model.source;
    assert.deepEqual(
      descendant.kind === "Join" && descendant.joinCondition,
      qom.descendantNodeJoinCondition("c", "p"),
    );
  });

  test("it keeps the constraints, the orderings and the columns built before it", () => {
    const built = from("jnt:page", "p")
      .where(({ p }) => p.prop("jcr:title").eq("Home"))
      .orderBy(({ p }) => p.prop("date").desc())
      .select(({ p }) => p.all())
      .joinSlow("jnt:content", "c")
      .on(({ c, p }) => c.isChildOf(p)).model;

    assert.deepEqual(built.constraint, qom.comparison(title, Operator.EQUAL_TO, literal("Home")));
    assert.deepEqual(built.orderings, [qom.descending(qom.propertyValue("p", "date"))]);
    assert.deepEqual(built.columns, [qom.column("p")]);
  });

  test("two sides that share an alias are caught at build time", () => {
    const clash = from("jnt:page", "p")
      .joinSlow("jnt:content", "p")
      .on(({ p }) => p.isChildOf(p));
    assert.equal(
      errorCode(() => clash.build()),
      "DUPLICATE_SELECTOR",
    );
  });
});

describe("the execution options", () => {
  test("limit, offset and bind never enter the model", () => {
    const base = from("jnt:event", "e").where(({ e }) => e.prop("startDate").ge($("since")));
    const executable = base
      .limit(5)
      .offset(10)
      .bind({ since: long(3) });

    assert.deepEqual(executable.model, base.model);
    assert.deepEqual(executable.execution, {
      limit: 5,
      offset: 10,
      bindings: { since: long(3) },
    });
  });

  test("unboundedSlow stores -1", () => {
    assert.deepEqual(from("jnt:page", "p").unboundedSlow().execution, { limit: -1 });
  });

  test("bind merges across calls", () => {
    const bound = from("jnt:page", "p").bind({ a: 1 }).bind({ b: "two", a: 3 });
    assert.deepEqual(bound.execution.bindings, { a: 3, b: "two" });
  });

  test("limit and offset reject a value that is not a whole count", () => {
    assert.equal(
      errorCode(() => from("jnt:page", "p").limit(-1)),
      "UNSUPPORTED",
    );
    assert.equal(
      errorCode(() => from("jnt:page", "p").limit(1.5)),
      "UNSUPPORTED",
    );
    assert.equal(
      errorCode(() => from("jnt:page", "p").offset(-1)),
      "UNSUPPORTED",
    );
    assert.equal(
      errorCode(() => from("jnt:page", "p").bind(null as unknown as Record<string, string>)),
      "UNSUPPORTED",
    );
  });

  test("one base serves several pages, as example 3 of the plan has it", () => {
    const news = from("jnt:news", "n")
      .orderBy(({ n }) => n.prop("date").desc())
      .limit(10);

    assert.deepEqual(news.offset(20).execution, { limit: 10, offset: 20 });
    assert.deepEqual(news.offset(30).execution, { limit: 10, offset: 30 });
    assert.deepEqual(news.execution, { limit: 10 });
  });
});

describe("immutability", () => {
  const base = from("jnt:page", "p").where(({ p }) => p.prop("jcr:title").eq("Home"));

  test("every chain call returns a new builder", () => {
    const calls = [
      base.where(({ p }) => p.prop("a").eq(1)),
      base.whereSlow(({ p }) => p.prop("a").lengthSlow().gtSlow(1)),
      base.orderBy(({ p }) => p.prop("a").asc()),
      base.orderBySlow(({ p }) => p.prop("a").lower().ascSlow()),
      base.select(({ p }) => p.all()),
      base.columns(({ p }) => p.all()),
      base.limit(10),
      base.unboundedSlow(),
      base.offset(10),
      base.bind({ a: 1 }),
      base.joinSlow("jnt:content", "c").on(({ c, p }) => c.isChildOf(p)),
    ];

    for (const call of calls) {
      assert.notEqual(call, base);
    }
  });

  test("the base keeps its own model and execution options", () => {
    const expected = qom.createQuery(
      page,
      qom.comparison(title, Operator.EQUAL_TO, literal("Home")),
    );

    base.where(({ p }) => p.prop("a").eq(1));
    base.orderBy(({ p }) => p.prop("a").asc());
    base.select(({ p }) => p.all());
    base.limit(10).offset(5).bind({ a: 1 });

    assert.deepEqual(base.model, expected);
    assert.deepEqual(base.execution, {});
  });

  test("the model of one builder is stable across reads", () => {
    assert.equal(base.model, base.model);
  });

  test("a builder is never thenable", () => {
    const executable = base.limit(10);
    assert.equal("then" in executable, false);
    assert.equal(typeof (executable as unknown as { then?: unknown }).then, "undefined");
  });
});

describe("build", () => {
  test("it returns the model and runs the cross-node checks", () => {
    const built = from("jnt:page", "p")
      .where(({ p }) => p.prop("jcr:title").eq("Home"))
      .limit(10);
    assert.deepEqual(built.build(), built.model);
  });

  test("it rejects a constraint that names an undeclared selector", () => {
    const foreign = qom.comparison(
      qom.propertyValue("q", "jcr:title"),
      Operator.EQUAL_TO,
      literal("Home"),
    );
    const builder = from("jnt:page", "p").where(foreign as unknown as Constraint<"p", "fast">);
    assert.equal(
      errorCode(() => builder.build()),
      "UNDECLARED_SELECTOR",
    );
  });

  test("strict throws on a none level diagnostic, and the plain build does not", () => {
    // NAME() with LIKE and no case transform fails at execution, see the diagnostics matrix.
    const failing = from("jnt:page", "p")
      .whereSlow(({ p }) => p.name().likeSlow("home%"))
      .limit(10);

    assert.deepEqual(failing.build(), failing.model);
    assert.equal(
      errorCode(() => failing.build({ strict: true })),
      "UNSUPPORTED",
    );
  });

  test("strict lets a conditional none level diagnostic through, and still reports it", () => {
    // A NOT or an UPPER around a property fails only once the rewriter has moved that property to a
    // translation selector, which needs an internationalised property in a localised session.
    const negated = from("jnt:page", "p")
      .where(({ p }) => not(p.prop("j:published").eq(true)))
      .limit(10);
    const upperCased = from("jnt:page", "p")
      .where(({ p }) => p.prop("jcr:title").upper().eq("HOME"))
      .limit(10);

    assert.deepEqual(negated.build({ strict: true }), negated.model);
    assert.deepEqual(upperCased.build({ strict: true }), upperCased.model);
    assert.deepEqual(
      negated.diagnose().map((finding) => [finding.level, finding.conditional]),
      [
        ["none", true],
        ["environment", undefined],
      ],
    );
  });

  test("strict lets a query with no none level finding through", () => {
    const fine = from("jnt:page", "p")
      .where(({ p }) => p.prop("jcr:title").eq("Home"))
      .limit(10);
    assert.deepEqual(fine.build({ strict: true }), fine.model);
  });
});

describe("diagnose", () => {
  test("it reads the model and the execution options together", () => {
    const findings = from("jnt:page", "p")
      .where(({ p }) => p.prop("jcr:title").eq("Home"))
      .limit(10)
      .offset(40000)
      .diagnose();

    assert.deepEqual(
      findings.map((finding) => finding.level),
      ["deep-offset", "environment"],
    );
  });

  test("it always ends with the environment entry", () => {
    const findings = from("jnt:page", "p").diagnose();
    assert.equal(findings.length, 1);
    assert.equal(findings[0].level, "environment");
  });
});

/**
 * Type fixtures. Every `@ts-expect-error` below is a compile time assertion: the build fails when a
 * type stops rejecting what it must reject, and it fails just as loudly when the error stops being
 * reported, because an unused directive is itself an error.
 */

declare function run(query: Queryable): void;

export function limitStateFixtures(): void {
  const base = from("jnt:page", "p").where(({ p }) => p.prop("jcr:title").eq("Home"));

  // A string statement and a builder whose limit was set are both queryable.
  run("SELECT * FROM [jnt:page]");
  run(base.limit(10));
  run(base.unboundedSlow());
  run(base.limit(10).offset(20).bind({ a: 1 }));

  // @ts-expect-error a builder without a limit is not executable
  run(base);

  // @ts-expect-error an offset does not make a builder executable
  run(base.offset(20));

  const executable: Executable<"p"> = base.limit(10);

  // @ts-expect-error the same check through the Executable alias
  const notExecutable: Executable<"p"> = base;

  // A narrow builder is assignable to the wide Executable the seams take.
  const wide: Executable = executable;
  assert.equal(typeof wide, "object");
  assert.equal(typeof notExecutable, "object");
}

export function speedFixtures(): void {
  const base = from("jnt:page", "p");

  // @ts-expect-error LENGTH() runs in memory, so the reference has no fast comparison
  base.whereSlow(({ p }) => p.prop("jcr:title").lengthSlow().gt(3));

  // @ts-expect-error a case transform runs in memory in an ordering, so it has no fast ordering
  base.orderBySlow(({ p }) => p.prop("jcr:title").lower().desc());

  // @ts-expect-error NAME() with LIKE is not an index operator, so the reference has no like()
  base.whereSlow(({ p }) => p.name().like("home%"));

  // @ts-expect-error NAME() outside equals runs in memory, so the reference has no gt()
  base.whereSlow(({ p }) => p.name().gt("home"));

  // @ts-expect-error LOCALNAME() outside equals and like runs in memory
  base.whereSlow(({ p }) => p.localName().gt("home"));

  // @ts-expect-error SCORE() runs in memory in a comparison, so the reference has no gt()
  base.whereSlow(({ p }) => p.score().gt(0.5));

  // @ts-expect-error where() takes a fast constraint only
  base.where(({ p }) => p.prop("jcr:title").lengthSlow().gtSlow(3));

  // @ts-expect-error and() propagates the slow speed of its children
  base.where(({ p }) => and(p.prop("jcr:title").eq("Home"), p.name().neSlow("home")));

  // @ts-expect-error or() propagates the slow speed of its children
  base.where(({ p }) => or(p.prop("jcr:title").eq("Home"), p.name().neSlow("home")));

  // @ts-expect-error not() propagates the slow speed of its child
  base.where(({ p }) => not(p.prop("jcr:title").lengthSlow().gtSlow(3)));

  // @ts-expect-error orderBy() takes a fast ordering only
  base.orderBy(({ p }) => p.prop("jcr:title").lower().ascSlow());

  // The Slow methods are required where the plan says, and the slow chain calls accept them.
  base.whereSlow(({ p }) => p.prop("jcr:title").lengthSlow().gtSlow(3));
  base.whereSlow(({ p }) => p.name().likeSlow("home%"));
  base.whereSlow(({ p }) => p.score().gtSlow(0.5));
  base.orderBySlow(({ p }) => p.prop("jcr:title").lower().descSlow());
  base.joinSlow("jnt:content", "c").on(({ c, p }) => c.isChildOf(p));
  base.unboundedSlow();

  // The fast chain calls accept every fast construct, facade and factory mixed.
  base.where(({ p }) => and(p.prop("jcr:title").eq("Home"), p.name().eq("home")));
  base.where(({ p }) => or(p.localName().like("home%"), p.contains("graal*")));
  base.where(({ p }) => not(p.prop("j:published").eq(true)));
  base.where(qom.comparison(title, Operator.EQUAL_TO, literal("Home")));
  base.orderBy(({ p }) => p.score().asc());
}

export function selectorFixtures(): void {
  const base = from("jnt:page", "p");

  // @ts-expect-error the alias "q" is not declared by this query
  base.where(({ q }) => q.prop("jcr:title").eq("Home"));

  const foreign: Constraint<"q", "fast"> = qom.comparison(
    qom.propertyValue("q", "jcr:title"),
    Operator.EQUAL_TO,
    literal("Home"),
  );

  // @ts-expect-error a constraint built for a foreign selector is rejected
  base.where(foreign);

  const foreignOrdering: Ordering<"q", "fast"> = qom.ascending(qom.propertyValue("q", "jcr:title"));

  // @ts-expect-error an ordering built for a foreign selector is rejected
  base.orderBy(foreignOrdering);

  // @ts-expect-error a column built for a foreign selector is rejected
  base.select(qom.column("q", "jcr:title"));

  // A join widens the alias union, so both sides are reachable in the callbacks.
  base
    .joinSlow("jnt:content", "c")
    .on(({ c, p }) => c.isChildOf(p))
    .where(({ c }) => c.prop("j:published").eq(true))
    .where(({ p }) => p.prop("jcr:title").eq("Home"));

  // @ts-expect-error the alias "x" is still not declared after the join
  base.joinSlow("jnt:content", "c").on(({ x }) => x.isChildOf(x));
}

describe("type fixtures", () => {
  test("they compile, which is the assertion", () => {
    for (const fixture of [limitStateFixtures, speedFixtures, selectorFixtures]) {
      assert.equal(typeof fixture, "function");
    }
  });
});
