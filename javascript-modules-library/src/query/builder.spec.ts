import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { and, from, not, or } from "./builder.js";
import type { Executable, Queryable, SelectorRef } from "./builder.js";
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

function errorMessage(run: () => unknown): string {
  try {
    run();
    return "no error was thrown";
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

const page = qom.selector("jnt:page");
const title = qom.propertyValue("jnt:page", "jcr:title");

/**
 * The same model under another selector name, which is the one difference an alias makes. A
 * single-selector model carries the name in `selectorName` and nowhere else.
 */
function renameSelector<T>(node: T, to: string): T {
  if (Array.isArray(node)) {
    return node.map((child: unknown) => renameSelector(child, to)) as T;
  }

  if (node === null || typeof node !== "object") {
    return node;
  }

  return Object.fromEntries(
    Object.entries(node).map(([key, value]) =>
      key === "selectorName" ? [key, to] : [key, renameSelector(value, to)],
    ),
  ) as T;
}

describe("from", () => {
  test("it starts an empty query over one node type, named after that node type", () => {
    assert.deepEqual(from("jnt:page").model, qom.createQuery(page, null, [], []));
  });

  test("it takes an alias, which is the name the selector then carries", () => {
    assert.deepEqual(
      from("jnt:page", "p").model,
      qom.createQuery(qom.selector("jnt:page", "p"), null, [], []),
    );
  });

  test("the short form builds the aliased model, under the node type as the name", () => {
    const short = from("jnt:news")
      .where((n) => n.prop("date").exists())
      .orderBy((n) => n.prop("date").desc()).model;
    const aliased = from("jnt:news", "n")
      .where(({ n }) => n.prop("date").exists())
      .orderBy(({ n }) => n.prop("date").desc()).model;

    assert.deepEqual(renameSelector(short, "n"), aliased);
  });

  test("without an alias the callback receives the one reference, and not a record", () => {
    let received: SelectorRef<"jnt:news"> | undefined;
    from("jnt:news").where((n) => {
      received = n;
      return n.prop("date").exists();
    });

    assert.equal(received?.selectorName, "jnt:news");
  });

  test("it carries no execution option before limit, offset or bind", () => {
    assert.deepEqual(from("jnt:page").execution, {});
  });

  test("it lifts a model the factory built", () => {
    const aliasedPage = qom.selector("jnt:page", "p");
    const model = qom.createQuery(aliasedPage, qom.propertyExistence("p", "jcr:title"));
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

  test("it checks the node type name and the alias against the JCR name grammar", () => {
    assert.equal(
      errorCode(() => from("jnt page/x")),
      "INVALID_NAME",
    );
    assert.equal(
      errorCode(() => from("jnt:page", "a|b")),
      "INVALID_NAME",
    );
    // A JavaScript caller does not see the types, so an alias that is not a name reaches the same
    // guard. Only `undefined` selects the short form.
    assert.equal(
      errorCode(() =>
        (from as unknown as (nodeType: string, alias: unknown) => unknown)("jnt:page", 42),
      ),
      "INVALID_NAME",
    );
  });
});

describe("where", () => {
  test("it builds the same model as the factory", () => {
    const built = from("jnt:page").where((p) => p.prop("jcr:title").eq("Home")).model;
    assert.deepEqual(
      built,
      qom.createQuery(page, qom.comparison(title, Operator.EQUAL_TO, literal("Home"))),
    );
  });

  test("it accepts a constraint that was built outside the callback", () => {
    const constraint: Constraint<"jnt:page", "fast"> = qom.comparison(
      title,
      Operator.EQUAL_TO,
      literal("Home"),
    );
    assert.deepEqual(from("jnt:page").where(constraint).model.constraint, constraint);
  });

  test("repeated calls fold with AND, in call order", () => {
    const built = from("jnt:page")
      .where((p) => p.prop("jcr:title").eq("Home"))
      .where((p) => p.prop("j:published").eq(true))
      .whereSlow((p) => p.prop("jcr:title").lengthSlow().gtSlow(3)).model;

    assert.deepEqual(
      built.constraint,
      qom.and(
        qom.and(
          qom.comparison(title, Operator.EQUAL_TO, literal("Home")),
          qom.comparison(
            qom.propertyValue("jnt:page", "j:published"),
            Operator.EQUAL_TO,
            literal(true),
          ),
        ),
        qom.comparisonSlow(qom.lengthSlow(title), Operator.GREATER_THAN, literal(3)),
      ),
    );
  });

  test("a path scope and a full text search take the plain names", () => {
    assert.deepEqual(
      from("jnt:news").where((n) => n.isDescendantOf("/sites/acme/contents")).model.constraint,
      qom.descendantNode("jnt:news", "/sites/acme/contents"),
    );
    assert.deepEqual(
      from("jnt:article").where((a) => a.fullText("graal*")).model.constraint,
      qom.fullTextSearch("jnt:article", null, literal("graal*")),
    );
    assert.deepEqual(
      from("jnt:page").where((p) => p.isChildOf("/sites/acme")).model.constraint,
      qom.childNode("jnt:page", "/sites/acme"),
    );
    assert.deepEqual(
      from("jnt:page").where((p) => p.isSameAs("/sites/acme/home")).model.constraint,
      qom.sameNode("jnt:page", "/sites/acme/home"),
    );
  });

  test("a bind variable stays a bind variable in the model", () => {
    assert.deepEqual(
      from("jnt:event").where((e) => e.prop("startDate").ge($("since"))).model.constraint,
      qom.comparison(
        qom.propertyValue("jnt:event", "startDate"),
        Operator.GREATER_THAN_OR_EQUAL_TO,
        qom.bindVariable("since"),
      ),
    );
  });

  test("a typed literal survives unchanged", () => {
    const since = date("2026-09-01T00:00:00.000+02:00");
    assert.deepEqual(
      from("jnt:event").where((e) => e.prop("startDate").ge(since)).model.constraint,
      qom.comparison(
        qom.propertyValue("jnt:event", "startDate"),
        Operator.GREATER_THAN_OR_EQUAL_TO,
        since,
      ),
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
      const built = from("jnt:page").where((p) => {
        const reference = p.prop("jcr:title") as unknown as Record<
          string,
          (value: string) => Constraint<"jnt:page", "fast">
        >;
        return reference[method]("Home");
      }).model.constraint;
      assert.deepEqual(built, qom.comparison(title, operator, literal("Home")));
    }
  });

  test("exists, fullText, asc and desc take the plain names", () => {
    assert.deepEqual(
      from("jnt:page").where((p) => p.prop("jcr:title").exists()).model.constraint,
      qom.propertyExistence("jnt:page", "jcr:title"),
    );
    assert.deepEqual(
      from("jnt:page").where((p) => p.prop("jcr:title").fullText("home")).model.constraint,
      qom.fullTextSearch("jnt:page", "jcr:title", literal("home")),
    );
    assert.deepEqual(from("jnt:page").orderBy((p) => p.prop("date").asc()).model.orderings, [
      qom.ascending(qom.propertyValue("jnt:page", "date")),
    ]);
    assert.deepEqual(from("jnt:page").orderBy((p) => p.prop("date").desc()).model.orderings, [
      qom.descending(qom.propertyValue("jnt:page", "date")),
    ]);
  });

  test("the score reference sorts natively and compares in memory", () => {
    assert.deepEqual(from("jnt:article").orderBy((a) => a.score().desc()).model.orderings, [
      qom.descending(qom.fullTextSearchScore("jnt:article")),
    ]);
    assert.deepEqual(
      from("jnt:article").whereSlow((a) => a.score().gtSlow(0.5)).model.constraint,
      qom.comparisonSlow(
        qom.fullTextSearchScore("jnt:article"),
        Operator.GREATER_THAN,
        literal(0.5),
      ),
    );
  });

  test("the name references keep their index operators fast", () => {
    assert.deepEqual(
      from("jnt:page").where((p) => p.name().eq("home")).model.constraint,
      qom.comparison(qom.nodeName("jnt:page"), Operator.EQUAL_TO, literal("home")),
    );
    assert.deepEqual(
      from("jnt:page").where((p) => p.localName().like("home%")).model.constraint,
      qom.comparison(qom.nodeLocalName("jnt:page"), Operator.LIKE, literal("home%")),
    );
    assert.deepEqual(
      from("jnt:page").whereSlow((p) => p.name().likeSlow("home%")).model.constraint,
      qom.comparisonSlow(qom.nodeName("jnt:page"), Operator.LIKE, literal("home%")),
    );
  });

  test("a case transform compares fast and orders slow", () => {
    assert.deepEqual(
      from("jnt:page").where((p) => p.prop("jcr:title").lower().eq("home")).model.constraint,
      qom.comparison(qom.lowerCase(title), Operator.EQUAL_TO, literal("home")),
    );
    assert.deepEqual(
      from("jnt:page").orderBySlow((p) => p.prop("jcr:title").lower().descSlow()).model.orderings,
      [qom.descendingSlow(qom.lowerCase(title))],
    );
    assert.deepEqual(
      from("jnt:page").where((p) => p.prop("jcr:title").upper().eq("HOME")).model.constraint,
      qom.comparison(qom.upperCase(title), Operator.EQUAL_TO, literal("HOME")),
    );
  });

  test("the length reference carries no fast method and orders slow", () => {
    assert.deepEqual(
      from("jnt:page").orderBySlow((p) => p.prop("jcr:title").lengthSlow().ascSlow()).model
        .orderings,
      [qom.ascendingSlow(qom.lengthSlow(title))],
    );
  });

  test("all() and as() build the two column shapes", () => {
    assert.deepEqual(from("jnt:page").select((p) => p.all()).model.columns, [
      qom.column("jnt:page"),
    ]);
    assert.deepEqual(
      from("jnt:page").select((p) => p.prop("jcr:title").as("pageTitle")).model.columns,
      [qom.column("jnt:page", "jcr:title", "pageTitle")],
    );
    assert.deepEqual(from("jnt:page").select((p) => p.prop("jcr:title").as()).model.columns, [
      qom.column("jnt:page", "jcr:title"),
    ]);
  });

  test("repeated select calls append", () => {
    assert.deepEqual(
      from("jnt:page")
        .select((p) => p.all())
        .select((p) => p.prop("jcr:title").as("t")).model.columns,
      [qom.column("jnt:page"), qom.column("jnt:page", "jcr:title", "t")],
    );
  });

  test("orderBy takes several orderings in one call, and appends across calls", () => {
    const built = from("jnt:news")
      .orderBy(
        (n) => n.prop("date").desc(),
        (n) => n.prop("jcr:uuid").asc(),
      )
      .orderBy((n) => n.prop("jcr:title").asc()).model.orderings;

    assert.deepEqual(built, [
      qom.descending(qom.propertyValue("jnt:news", "date")),
      qom.ascending(qom.propertyValue("jnt:news", "jcr:uuid")),
      qom.ascending(qom.propertyValue("jnt:news", "jcr:title")),
    ]);
  });
});

describe("the folded predicates", () => {
  const constraintOf = (build: (page: SelectorRef<"jnt:page">) => unknown) =>
    from("jnt:page").where(build as never).model.constraint;

  /** The `LIKE` pattern a built comparison carries, which is the text the engine receives. */
  const patternOf = (build: (page: SelectorRef<"jnt:page">) => unknown) =>
    (constraintOf(build) as unknown as { operand2: { value: string } }).operand2.value;

  test("in() folds to = comparisons joined with OR, in the order of the list", () => {
    assert.deepEqual(
      constraintOf((p) => p.prop("cat").in(["a", "b", "c"])),
      qom.or(
        qom.or(
          qom.comparison(qom.propertyValue("jnt:page", "cat"), Operator.EQUAL_TO, literal("a")),
          qom.comparison(qom.propertyValue("jnt:page", "cat"), Operator.EQUAL_TO, literal("b")),
        ),
        qom.comparison(qom.propertyValue("jnt:page", "cat"), Operator.EQUAL_TO, literal("c")),
      ),
    );
  });

  test("in() with one value folds to that one comparison", () => {
    assert.deepEqual(
      constraintOf((p) => p.prop("cat").in(["a"])),
      qom.comparison(qom.propertyValue("jnt:page", "cat"), Operator.EQUAL_TO, literal("a")),
    );
  });

  test("in() with an empty list throws, because it would match nothing", () => {
    assert.equal(
      errorCode(() => from("jnt:page").where((p) => p.prop("cat").in([]))),
      "NULL_CONSTRAINT",
    );
  });

  test("in() types each value on its own, as a comparison does", () => {
    assert.deepEqual(
      constraintOf((p) => p.prop("mixed").in([1, "a", true])),
      qom.or(
        qom.or(
          qom.comparison(qom.propertyValue("jnt:page", "mixed"), Operator.EQUAL_TO, literal(1)),
          qom.comparison(qom.propertyValue("jnt:page", "mixed"), Operator.EQUAL_TO, literal("a")),
        ),
        qom.comparison(qom.propertyValue("jnt:page", "mixed"), Operator.EQUAL_TO, literal(true)),
      ),
    );
  });

  test("in() is available on a case transform, a name and a local name", () => {
    assert.deepEqual(
      constraintOf((p) => p.prop("jcr:title").lower().in(["home"])),
      qom.comparison(
        qom.lowerCase(qom.propertyValue("jnt:page", "jcr:title")),
        Operator.EQUAL_TO,
        literal("home"),
      ),
    );
    assert.deepEqual(
      constraintOf((p) => p.name().in(["home"])),
      qom.comparison(qom.nodeName("jnt:page"), Operator.EQUAL_TO, literal("home")),
    );
    assert.deepEqual(
      constraintOf((p) => p.localName().in(["home"])),
      qom.comparison(qom.nodeLocalName("jnt:page"), Operator.EQUAL_TO, literal("home")),
    );
  });

  test("between() folds to >= and <=, both ends included", () => {
    assert.deepEqual(
      constraintOf((p) => p.prop("count").between(1, 10)),
      qom.and(
        qom.comparison(
          qom.propertyValue("jnt:page", "count"),
          Operator.GREATER_THAN_OR_EQUAL_TO,
          literal(1),
        ),
        qom.comparison(
          qom.propertyValue("jnt:page", "count"),
          Operator.LESS_THAN_OR_EQUAL_TO,
          literal(10),
        ),
      ),
    );
  });

  test("between() takes typed literals, so a date range stays a date range", () => {
    const low = date("2026-01-01T00:00:00.000Z");
    const high = date("2026-12-31T00:00:00.000Z");
    assert.deepEqual(
      constraintOf((p) => p.prop("startDate").between(low, high)),
      qom.and(
        qom.comparison(
          qom.propertyValue("jnt:page", "startDate"),
          Operator.GREATER_THAN_OR_EQUAL_TO,
          low,
        ),
        qom.comparison(
          qom.propertyValue("jnt:page", "startDate"),
          Operator.LESS_THAN_OR_EQUAL_TO,
          high,
        ),
      ),
    );
  });

  test("between() is available on a case transform", () => {
    assert.deepEqual(
      constraintOf((p) => p.prop("jcr:title").lower().between("a", "b")),
      qom.and(
        qom.comparison(
          qom.lowerCase(qom.propertyValue("jnt:page", "jcr:title")),
          Operator.GREATER_THAN_OR_EQUAL_TO,
          literal("a"),
        ),
        qom.comparison(
          qom.lowerCase(qom.propertyValue("jnt:page", "jcr:title")),
          Operator.LESS_THAN_OR_EQUAL_TO,
          literal("b"),
        ),
      ),
    );
  });

  test("the three text methods put the wildcard on the side their name says", () => {
    const property = qom.propertyValue("jnt:page", "jcr:title");
    assert.deepEqual(
      constraintOf((p) => p.prop("jcr:title").startsWith("Home")),
      qom.comparison(property, Operator.LIKE, literal("Home%")),
    );
    assert.deepEqual(
      constraintOf((p) => p.prop("jcr:title").endsWith("Home")),
      qom.comparison(property, Operator.LIKE, literal("%Home")),
    );
    assert.deepEqual(
      constraintOf((p) => p.prop("jcr:title").contains("Home")),
      qom.comparison(property, Operator.LIKE, literal("%Home%")),
    );
  });

  /**
   * The escaping table, read against a live Jackrabbit `2.22.0-jahia1` on Jahia 8.2.3.2. Every
   * pattern below was executed there and returned the node that holds the characters verbatim, so
   * these assertions are the unit-level record of a measured behaviour and not of an assumption.
   *
   * Only `%`, `_` and the backslash are escaped. Jackrabbit unescapes those three faithfully and
   * keeps the backslash in front of a letter or a digit, so escaping any other character would
   * build a pattern that matches nothing.
   */
  test("the three text methods escape the two wildcards and the escape character", () => {
    assert.equal(
      patternOf((p) => p.prop("jcr:title").startsWith("50%")),
      "50\\%%",
    );
    assert.equal(
      patternOf((p) => p.prop("jcr:title").startsWith("50% off")),
      "50\\% off%",
    );
    assert.equal(
      patternOf((p) => p.prop("jcr:title").startsWith("mee_ing")),
      "mee\\_ing%",
    );
    assert.equal(
      patternOf((p) => p.prop("jcr:title").startsWith("c:\\temp")),
      "c:\\\\temp%",
    );
    assert.equal(
      patternOf((p) => p.prop("jcr:title").startsWith("%_\\")),
      "\\%\\_\\\\%",
    );
    assert.equal(
      patternOf((p) => p.prop("jcr:title").endsWith("50%")),
      "%50\\%",
    );
    assert.equal(
      patternOf((p) => p.prop("jcr:title").contains("50%")),
      "%50\\%%",
    );
    assert.equal(
      patternOf((p) => p.prop("jcr:title").contains("_")),
      "%\\_%",
    );
    // An apostrophe is not a `LIKE` special, so it travels unescaped. The statement path doubles
    // it inside the string literal, and the two escapes compose without interfering.
    assert.equal(
      patternOf((p) => p.prop("jcr:title").contains("it's 50%")),
      "%it's 50\\%%",
    );
  });

  test("empty text leaves the wildcards alone, so the pattern matches every value", () => {
    assert.equal(
      patternOf((p) => p.prop("jcr:title").startsWith("")),
      "%",
    );
    assert.equal(
      patternOf((p) => p.prop("jcr:title").endsWith("")),
      "%",
    );
    assert.equal(
      patternOf((p) => p.prop("jcr:title").contains("")),
      "%%",
    );
  });

  test("the three text methods refuse a value that is not a string, and name themselves", () => {
    for (const method of ["startsWith", "endsWith", "contains"] as const) {
      const run = () => from("jnt:page").where((p) => p.prop("jcr:title")[method](3 as never));
      assert.equal(errorCode(run), "UNSUPPORTED");
      assert.match(errorMessage(run), new RegExp(`^${method}\\(\\) needs a string`));
    }
  });

  test("the three text methods are on a case transform and on a local name too", () => {
    const lowerTitle = qom.lowerCase(qom.propertyValue("jnt:page", "jcr:title"));
    assert.deepEqual(
      constraintOf((p) => p.prop("jcr:title").lower().startsWith("ho")),
      qom.comparison(lowerTitle, Operator.LIKE, literal("ho%")),
    );
    assert.deepEqual(
      constraintOf((p) => p.prop("jcr:title").lower().endsWith("me")),
      qom.comparison(lowerTitle, Operator.LIKE, literal("%me")),
    );
    assert.deepEqual(
      constraintOf((p) => p.prop("jcr:title").upper().contains("OM")),
      qom.comparison(
        qom.upperCase(qom.propertyValue("jnt:page", "jcr:title")),
        Operator.LIKE,
        literal("%OM%"),
      ),
    );
    assert.deepEqual(
      constraintOf((p) => p.localName().startsWith("home")),
      qom.comparison(qom.nodeLocalName("jnt:page"), Operator.LIKE, literal("home%")),
    );
    assert.deepEqual(
      constraintOf((p) => p.localName().endsWith("page")),
      qom.comparison(qom.nodeLocalName("jnt:page"), Operator.LIKE, literal("%page")),
    );
    assert.deepEqual(
      constraintOf((p) => p.localName().contains("me-pa")),
      qom.comparison(qom.nodeLocalName("jnt:page"), Operator.LIKE, literal("%me-pa%")),
    );
  });

  test("a case transform escapes the text the same way the raw property does", () => {
    assert.deepEqual(
      constraintOf((p) => p.prop("jcr:title").lower().contains("50%")),
      qom.comparison(
        qom.lowerCase(qom.propertyValue("jnt:page", "jcr:title")),
        Operator.LIKE,
        literal("%50\\%%"),
      ),
    );
    assert.deepEqual(
      constraintOf((p) => p.localName().contains("a_b")),
      qom.comparison(qom.nodeLocalName("jnt:page"), Operator.LIKE, literal("%a\\_b%")),
    );
  });

  test("notExists() is the negated existence", () => {
    assert.deepEqual(
      constraintOf((p) => p.prop("subtitle").notExists()),
      qom.not(qom.propertyExistence("jnt:page", "subtitle")),
    );
  });

  test("notExists() is the exact negation of exists()", () => {
    assert.deepEqual(
      constraintOf((p) => p.prop("subtitle").notExists()),
      qom.not(constraintOf((p) => p.prop("subtitle").exists()) as never),
    );
  });
});

describe("fullText", () => {
  test("on a selector it searches every property, and on a property only that one", () => {
    assert.deepEqual(
      from("jnt:article").where((a) => a.fullText("graal*")).model.constraint,
      qom.fullTextSearch("jnt:article", null, literal("graal*")),
    );
    assert.deepEqual(
      from("jnt:article").where((a) => a.prop("body").fullText("graal*")).model.constraint,
      qom.fullTextSearch("jnt:article", "body", literal("graal*")),
    );
  });

  test("it takes a bind variable as well as a plain value", () => {
    assert.deepEqual(
      from("jnt:article").where((a) => a.fullText($("words"))).model.constraint,
      qom.fullTextSearch("jnt:article", null, $("words")),
    );
  });
});

/**
 * Full text search and pattern matching read two different stores, and the two are easy to confuse
 * here for one reason: Jahia's GraphQL `nodesByCriteria` API names the full text search `contains`
 * and the raw pattern match `like`, while this builder names the raw pattern match `contains()` and
 * the full text search `fullText()`. The word `contains` therefore names a different operator in
 * each API. This suite pins what each method builds, so that the difference is a test and not a
 * paragraph.
 *
 * Three instruments measured the behaviours named in the comments below. The accent, stem and node
 * name facts come from the `nodesByCriteria` lab that the Cortex lesson records, run through
 * `/modules/graphql` on Jahia 8.2. The wildcard and pattern facts come from a Groovy lab run on
 * Jahia 8.2.3.2 over a fixture folder it created itself. The expression facts come from a third
 * run, 195 expressions sent to `nodesByCriteria` on 8.2.3.2, which reaches the same parser. Where a
 * comment names a shape no lab ran, it says so. The store split explains all of it: full text reads
 * the Lucene index, which is lowercased, accent folded, stemmed and tokenised, and `LIKE` reads the
 * raw stored property value.
 */
describe("the two searches, and what tells them apart", () => {
  const constraintOf = (build: (page: SelectorRef<"jnt:page">) => unknown) =>
    from("jnt:page").where(build as never).model.constraint;

  /** The `LIKE` pattern a built comparison carries, which is the text the engine receives. */
  const patternOf = (build: (page: SelectorRef<"jnt:page">) => unknown) =>
    (constraintOf(build) as unknown as { operand2: { value: string } }).operand2.value;

  test("fullText() searches the index, and contains() matches the raw value", () => {
    // The index folds accents and stems words, so the full text clause finds a title written
    // "Châteaux" for the term "chateaux". The pattern below folds nothing: it matches the eight
    // characters of the term against the stored value, and that title is not among its matches.
    assert.deepEqual(
      constraintOf((p) => p.prop("jcr:title").fullText("chateaux")),
      qom.fullTextSearch("jnt:page", "jcr:title", literal("chateaux")),
    );
    assert.deepEqual(
      constraintOf((p) => p.prop("jcr:title").contains("chateaux")),
      qom.comparison(title, Operator.LIKE, literal("%chateaux%")),
    );
  });

  test("the two calls build two different nodes, so neither name can stand for both", () => {
    // A developer who arrives from nodesByCriteria reads `contains()` as the full text search and
    // receives a raw pattern match, with no accent folding and no stemming. The query then returns
    // less than expected and reports no error, which is why the two shapes are asserted apart.
    const fullText = constraintOf((p) => p.prop("jcr:title").fullText("chateaux"));
    const pattern = constraintOf((p) => p.prop("jcr:title").contains("chateaux"));

    assert.equal((fullText as { kind: string }).kind, "FullTextSearch");
    assert.equal((pattern as { kind: string }).kind, "Comparison");
    assert.notDeepEqual(fullText, pattern);
  });

  test("the two wildcard alphabets do not cross", () => {
    // A full text expression uses `*`, and a pattern uses `%` and `_`. A `%` is an ordinary
    // character in an expression, and the analyser splits the term at it: `%priv%` searches for
    // `priv`, while `ho%me` searches for `ho` and `me` together and matched nothing where `home`
    // matched. Next to a star the `%` is not harmless either, because a term carrying a `*` skips
    // the analyser: `%priv*%` matched nothing where `priv*` matched. The builder passes the
    // expression through unchanged, which is what a query builder owes a developer who wrote a JCR
    // expression by hand.
    assert.deepEqual(
      constraintOf((p) => p.fullText("%priv%")),
      qom.fullTextSearch("jnt:page", null, literal("%priv%")),
    );
    assert.deepEqual(
      constraintOf((p) => p.fullText("%priv*%")),
      qom.fullTextSearch("jnt:page", null, literal("%priv*%")),
    );

    // The other direction is the mirror image. A `*` carries no meaning inside a pattern, and
    // `contains()` takes literal text, so the star is one more character to match.
    assert.equal(
      patternOf((p) => p.prop("jcr:title").contains("priv*")),
      "%priv*%",
    );
    assert.equal(
      patternOf((p) => p.prop("jcr:title").startsWith("priv*")),
      "priv*%",
    );
  });

  test("the same characters mean two things, one per method", () => {
    // `%priv*%` is a full text expression that matches nothing, and it is also the pattern that
    // `contains("priv*")` builds, which matches a value holding the four characters `priv` and a
    // star. One string, two readings, and the method name is the only thing that separates them.
    assert.equal(
      patternOf((p) => p.prop("jcr:title").contains("priv*")),
      (
        constraintOf((p) => p.fullText("%priv*%")) as unknown as {
          fullTextSearchExpression: { value: string };
        }
      ).fullTextSearchExpression.value,
    );
  });

  test("an expression the Jahia parser rejects is reported, and the strict build refuses it", () => {
    // Each of these returned `javax.jcr.RepositoryException: Invalid full text search expression`,
    // raised inside `execute()` once the whole query object already existed. The builder is a query
    // builder and not a search box, so it rewrites nothing: the expression still reaches the model
    // exactly as it was written, and the refusal happens at the gate instead.
    for (const expression of ["privacy!", "foo(", '"unclosed', "OR", "--", "home -", "home OR"]) {
      const query = from("jnt:page")
        .where((p) => p.fullText(expression))
        .limit(10);

      assert.deepEqual(
        query.model.constraint,
        qom.fullTextSearch("jnt:page", null, literal(expression)),
      );
      assert.deepEqual(
        query.diagnose().map((finding) => `${finding.level} ${finding.at}`),
        ["none constraint.fullTextSearchExpression"],
        `${expression} must be reported`,
      );
      assert.equal(
        errorCode(() => query.build({ strict: true })),
        "UNSUPPORTED",
      );
    }

    // The failure covers the whole constraint, so one rejected expression takes the clauses beside
    // it down as well. Refusing at the gate is what saves the sibling clause from a term the caller
    // never sanitised.
    const mixed = from("jnt:page")
      .where((p) => or(p.fullText("privacy!"), p.prop("jcr:title").contains("privacy")))
      .limit(10);
    assert.deepEqual(
      mixed.diagnose().map((finding) => finding.level),
      ["none"],
    );
    assert.equal(
      errorCode(() => mixed.build({ strict: true })),
      "UNSUPPORTED",
    );
  });

  test("an expression the Jahia parser accepts is left alone, whatever it looks like", () => {
    // The other half of the guard above, and the half that matters most: a rule that refuses a
    // query must never refuse a legal one. Each one is a shape that could look wrong to a careless
    // rule. `graal*` ends in a wildcard, the phrase holds two quotation marks, `OR` sits between
    // two terms rather than alone, and `-policy` opens with the exclusion operator.
    //
    // Every one of these was run against Jahia and came back without an error. `chateaux OR policy`
    // and `-policy` returned no row, which is a result and not a rejection, and the assertion here
    // is only that no rule fires. The quoted phrase stands for `"policies published"`, which the
    // lab ran; `graal*` has the shape of `priv*`, which it also ran.
    //
    // The last four are the ones that decide how narrow the rules have to be. `C++` and `home-` end
    // on an operator character, and they run because `+` and `-` are term characters once a term
    // has begun. `"a (b" home` holds a parenthesis inside a quoted phrase, where it is text. `term\`
    // ends on a backslash with nothing left to escape, and it runs too.
    for (const expression of [
      "graal*",
      '"exact phrase"',
      "chateaux OR policy",
      "-policy",
      "chateaux zzzznomatch",
      "seat*",
      "*hateau*",
      "(a OR b) c",
      "term\\!",
      "C++",
      "home-",
      '"a (b" home',
      "term\\",
    ]) {
      const query = from("jnt:page")
        .where((p) => p.fullText(expression))
        .limit(10);

      assert.deepEqual(query.diagnose(), [], `${expression} must be accepted`);
      assert.deepEqual(query.build({ strict: true }), query.model);
    }
  });

  test("a percent sign is reported as the wrong alphabet, and the query still runs", () => {
    // A `%` is not a syntax error and it is a deliberate escape in one measured case, so it is
    // reported at `partial` and never refused. `%privacy!%` returned rows where `privacy!` failed,
    // so the finding it carries is this one alone.
    for (const expression of ["%priv%", "%priv*%", "%privacy!%"]) {
      const query = from("jnt:page")
        .where((p) => p.fullText(expression))
        .limit(10);

      assert.deepEqual(
        query.diagnose().map((finding) => finding.level),
        ["partial"],
        `${expression} must be reported once`,
      );
      assert.deepEqual(query.build({ strict: true }), query.model);
    }
  });

  test("a bind variable carries no expression to read, so nothing is reported", () => {
    // The guard reads a string literal. A variable holds its value outside the model, so an
    // expression supplied at execution time is never inspected and never refused.
    const query = from("jnt:page")
      .where((p) => p.fullText($("words")))
      .limit(10)
      .bind({ words: "privacy!" });

    assert.deepEqual(query.diagnose(), []);
    assert.deepEqual(query.build({ strict: true }), query.model);
  });

  test("a leading minus stays the exclusion operator of the full text grammar", () => {
    // `contains: "-policy"` matched nothing, because a leading `-` is the NOT operator, while
    // `contains: "%-policy%"` matched 2 nodes. Both are valid expressions, so both are passed
    // through and the caller decides which one it meant.
    assert.deepEqual(
      constraintOf((p) => p.fullText("-policy")),
      qom.fullTextSearch("jnt:page", null, literal("-policy")),
    );
    assert.deepEqual(
      constraintOf((p) => p.fullText("%-policy%")),
      qom.fullTextSearch("jnt:page", null, literal("%-policy%")),
    );
  });

  test("a case transform lowercases the property and not the pattern, so the wrong case throws", () => {
    // `LOWER(node.[prop]) LIKE '<pattern>'` compares a lowercased value against the pattern as it
    // was written, so a pattern that carries an uppercase letter can never match. Jahia answers
    // that with an empty result and not with an error, and the builder holds both the transform and
    // the text at the call, so the call is refused there, the way `in([])` is refused.
    assert.equal(
      errorCode(() =>
        from("jnt:page").where((p) => p.prop("jcr:title").lower().contains("Privacy")),
      ),
      "NULL_CONSTRAINT",
    );
    assert.match(
      errorMessage(() =>
        from("jnt:page").where((p) => p.prop("jcr:title").lower().contains("Privacy")),
      ),
      /lower\(\)\.contains\("Privacy"\) can never match.*"privacy"/,
    );
    assert.equal(
      errorCode(() => from("jnt:page").where((p) => p.prop("jcr:title").upper().eq("Home"))),
      "NULL_CONSTRAINT",
    );

    // The form that matches is the one whose text is already in the case the transform produces.
    assert.equal(
      patternOf((p) => p.prop("jcr:title").lower().contains("privacy")),
      "%privacy%",
    );
    assert.equal(
      patternOf((p) => p.prop("jcr:title").upper().contains("PRIVACY")),
      "%PRIVACY%",
    );
  });

  test("the guard covers the seven matching methods and leaves the five bounds alone", () => {
    const wrong = (build: (page: SelectorRef<"jnt:page">) => unknown) =>
      errorCode(() => from("jnt:page").where(build as never));

    // Every method whose result turns on the exact value. Each one would build a comparison that
    // Jahia runs without complaint and that returns the wrong rows.
    assert.equal(
      wrong((p) => p.prop("jcr:title").lower().eq("Home")),
      "NULL_CONSTRAINT",
    );
    assert.equal(
      wrong((p) => p.prop("jcr:title").lower().in(["home", "Away"])),
      "NULL_CONSTRAINT",
    );
    assert.equal(
      wrong((p) => p.prop("jcr:title").lower().like("%Home%")),
      "NULL_CONSTRAINT",
    );
    assert.equal(
      wrong((p) => p.prop("jcr:title").lower().startsWith("Ho")),
      "NULL_CONSTRAINT",
    );
    assert.equal(
      wrong((p) => p.prop("jcr:title").lower().endsWith("Me")),
      "NULL_CONSTRAINT",
    );
    assert.equal(
      wrong((p) => p.prop("jcr:title").lower().contains("Om")),
      "NULL_CONSTRAINT",
    );
    assert.equal(
      wrong((p) => p.prop("jcr:title").upper().contains("om")),
      "NULL_CONSTRAINT",
    );

    // `ne` is refused for the mirror reason, and it is the one the reader is most likely to think
    // safe. `LOWER(prop) <> 'Home'` excludes nothing, because no lowercased value equals that text,
    // so the clause returns every node that carries the property instead of every node but one.
    assert.equal(
      wrong((p) => p.prop("jcr:title").lower().ne("Home")),
      "NULL_CONSTRAINT",
    );
    assert.match(
      errorMessage(() => from("jnt:page").where((p) => p.prop("jcr:title").lower().ne("Home"))),
      /lower\(\)\.ne\("Home"\) can never exclude anything.*"home"/,
    );

    // A bound over a transformed value is a range test and not a match, so a mixed case value there
    // is a legitimate comparison and passes through.
    for (const build of [
      (p: SelectorRef<"jnt:page">) => p.prop("jcr:title").lower().lt("Home"),
      (p: SelectorRef<"jnt:page">) => p.prop("jcr:title").lower().le("Home"),
      (p: SelectorRef<"jnt:page">) => p.prop("jcr:title").lower().gt("Home"),
      (p: SelectorRef<"jnt:page">) => p.prop("jcr:title").lower().ge("Home"),
      (p: SelectorRef<"jnt:page">) => p.prop("jcr:title").lower().between("A", "Z"),
    ]) {
      assert.equal(wrong(build), undefined);
    }

    // The list method names the element at fault by its position, because the call site wrote a
    // list and no call anywhere in the source reads `in("Away")`.
    assert.match(
      errorMessage(() =>
        from("jnt:page").where((p) => p.prop("jcr:title").lower().in(["home", "Away"])),
      ),
      /lower\(\)\.in\(\[\.\.\.\]\) can never match on its value at index 1, "Away".*"away"/,
    );

    // Text that carries no letter has one case only, and a bind variable holds its value outside
    // the model, so neither is refused.
    assert.equal(
      wrong((p) => p.prop("jcr:title").lower().contains("50% off")),
      undefined,
    );
    assert.equal(
      wrong((p) => p.prop("jcr:title").lower().eq($("title"))),
      undefined,
    );
  });

  test("a pattern match always names a property, and only full text reads a whole node", () => {
    // In GraphQL, `{like: "%privacy%"}` with no property answers `'property' field is required`,
    // and `{contains: "privacy"}` searches every property. The restriction comes from JCR QOM: a
    // comparison takes one operand, and `FullTextSearch` is the only one whose property name may be
    // null. The builder makes that structural rather than documented.
    let members: string[] = [];
    from("jnt:page").where((p) => {
      members = Object.keys(p);
      return p.fullText("privacy");
    });

    assert.ok(members.includes("fullText"));
    for (const absent of ["like", "contains", "startsWith", "endsWith"]) {
      assert.ok(!members.includes(absent), `a selector reference must not carry ${absent}()`);
    }

    // The factory closes the other route: a property value with no property name is not a node it
    // builds, while a full text search with no property name is.
    assert.equal(
      errorCode(() => qom.propertyValue("jnt:page", null as unknown as string)),
      "INVALID_NAME",
    );
    assert.deepEqual(qom.fullTextSearch("jnt:page", null, literal("privacy")), {
      kind: "FullTextSearch",
      selectorName: "jnt:page",
      propertyName: null,
      fullTextSearchExpression: literal("privacy"),
    });
  });

  test("the one node name pattern match is reported and refused", () => {
    // `function: NODE_NAME` with `like` answers `UnsupportedRepositoryOperationException` every
    // time, so `likeSlow()` on a name reference can only ever fail. It is the one method of the
    // facade in that state, which is why `diagnose()` reports it and the strict build refuses it.
    const byName = from("jnt:page")
      .whereSlow((p) => p.name().likeSlow("%priv%"))
      .limit(10);

    assert.deepEqual(
      byName.diagnose().map((finding) => finding.level),
      ["none"],
    );
    assert.equal(
      errorCode(() => byName.build({ strict: true })),
      "UNSUPPORTED",
    );

    // `LOCALNAME()` is the node name operand that does serve a pattern, and it is the form to use.
    const byLocalName = from("jnt:page")
      .where((p) => p.localName().contains("priv"))
      .limit(10);

    assert.deepEqual(byLocalName.diagnose(), []);
    assert.equal(
      patternOf((p) => p.localName().contains("priv")),
      "%priv%",
    );
  });

  test("text a visitor typed cannot widen a pattern the builder escaped", () => {
    // A pattern carries the caller's own text, and `%` and `_` are wildcards there: a visitor who
    // typed `%` matched every node of the measured corpus. The three text methods escape the
    // backslash, the percent sign and the underscore, and nothing else, because Jackrabbit keeps a
    // backslash that sits in front of a letter or a digit.
    assert.equal(
      patternOf((p) => p.prop("jcr:title").contains("%")),
      "%\\%%",
    );
    assert.equal(
      patternOf((p) => p.prop("jcr:title").contains("%_%")),
      "%\\%\\_\\%%",
    );

    // A full text expression has no escape of that kind, so a caller that forwards visitor input
    // sanitises it before it builds the clause.
    assert.deepEqual(
      constraintOf((p) => p.fullText("%")),
      qom.fullTextSearch("jnt:page", null, literal("%")),
    );
  });

  test("the search a visitor expects is a composition of the two clauses", () => {
    // A case insensitive and accent insensitive search needs both stores. The full text clause
    // matches the analysed terms, and the pattern clause matches the raw characters the analyser
    // never produced. The caller still owns the folding and the sanitisation, because neither
    // belongs to a query builder.
    const query = from("jnt:page")
      .where((p) => or(p.fullText("chateaux"), p.prop("jcr:title").lower().contains("chateaux")))
      .limit(20);

    assert.deepEqual(
      query.model.constraint,
      qom.or(
        qom.fullTextSearch("jnt:page", null, literal("chateaux")),
        qom.comparison(qom.lowerCase(title), Operator.LIKE, literal("%chateaux%")),
      ),
    );
    assert.deepEqual(query.diagnose(), []);
  });

  test("a wildcard term is matched against the stem the index holds", () => {
    // The analyser stems, and a term that carries a wildcard is not analysed, so the two rules meet
    // in the middle. Over a value of `500 seats available`, `fullText("seats*")` matched nothing and
    // `fullText("seat*")` matched, because the index holds the stem `seat` and the wildcard term
    // never reaches it. The expression travels unchanged, so the caller writes its own term against
    // the stem before it adds a star.
    for (const expression of ["seats*", "seat*"]) {
      assert.deepEqual(
        constraintOf((p) => p.fullText(expression)),
        qom.fullTextSearch("jnt:page", null, literal(expression)),
      );
    }
  });

  test("the node name answers a search of the whole node and not one scoped to the property", () => {
    // A node named `oauth-result` answered `fullText("oauth")` over the whole node, and answered
    // nothing when the same search named `j:nodename`: the name reaches the aggregated node text,
    // and the property keeps a field that the term never enters. The raw pattern reads the stored
    // name instead, so `contains()` on that property does match. Three shapes, three answers.
    assert.deepEqual(
      constraintOf((p) => p.fullText("oauth")),
      qom.fullTextSearch("jnt:page", null, literal("oauth")),
    );
    assert.deepEqual(
      constraintOf((p) => p.prop("j:nodename").fullText("oauth")),
      qom.fullTextSearch("jnt:page", "j:nodename", literal("oauth")),
    );
    assert.equal(
      patternOf((p) => p.prop("j:nodename").contains("oauth")),
      "%oauth%",
    );
  });

  test("an empty term builds a pattern that matches every node, and an expression that fails", () => {
    // The two methods break in opposite directions on the same empty string. `contains("")` builds
    // `LIKE '%%'`, which matched every node of the measured corpus rather than none, and
    // `fullText("")` fails the whole query with `javax.jcr.RepositoryException: Invalid full text
    // search expression`. Only the second one can be told apart from a deliberate query, so only
    // that one is reported. A search box skips the clause when its sanitised term is empty.
    assert.equal(
      patternOf((p) => p.prop("jcr:title").contains("")),
      "%%",
    );
    assert.deepEqual(
      from("jnt:page")
        .where((p) => p.prop("jcr:title").contains(""))
        .limit(10)
        .diagnose(),
      [],
    );

    assert.deepEqual(
      constraintOf((p) => p.fullText("")),
      qom.fullTextSearch("jnt:page", null, literal("")),
    );
    const empty = from("jnt:page")
      .where((p) => p.fullText(""))
      .limit(10);
    assert.deepEqual(
      empty.diagnose().map((finding) => finding.level),
      ["none"],
    );
    assert.equal(
      errorCode(() => empty.build({ strict: true })),
      "UNSUPPORTED",
    );
  });
});

describe("and, or and not", () => {
  const published = qom.comparison(
    qom.propertyValue("jnt:page", "j:published"),
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
    const built = from("jnt:page").where((p) =>
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
          qom.selector("jnt:page", "p"),
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

    assert.deepEqual(
      built.constraint,
      qom.comparison(qom.propertyValue("p", "jcr:title"), Operator.EQUAL_TO, literal("Home")),
    );
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
    const base = from("jnt:event").where((e) => e.prop("startDate").ge($("since")));
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
    assert.deepEqual(from("jnt:page").unboundedSlow().execution, { limit: -1 });
  });

  test("bind merges across calls", () => {
    const bound = from("jnt:page").bind({ a: 1 }).bind({ b: "two", a: 3 });
    assert.deepEqual(bound.execution.bindings, { a: 3, b: "two" });
  });

  test("limit and offset reject a value that is not a whole count", () => {
    assert.equal(
      errorCode(() => from("jnt:page").limit(-1)),
      "UNSUPPORTED",
    );
    assert.equal(
      errorCode(() => from("jnt:page").limit(1.5)),
      "UNSUPPORTED",
    );
    assert.equal(
      errorCode(() => from("jnt:page").offset(-1)),
      "UNSUPPORTED",
    );
    assert.equal(
      errorCode(() => from("jnt:page").bind(null as unknown as Record<string, string>)),
      "UNSUPPORTED",
    );
  });

  test("one base serves several pages, as example 3 of the plan has it", () => {
    const news = from("jnt:news")
      .orderBy((n) => n.prop("date").desc())
      .limit(10);

    assert.deepEqual(news.offset(20).execution, { limit: 10, offset: 20 });
    assert.deepEqual(news.offset(30).execution, { limit: 10, offset: 30 });
    assert.deepEqual(news.execution, { limit: 10 });
  });
});

describe("immutability", () => {
  const base = from("jnt:page").where((p) => p.prop("jcr:title").eq("Home"));

  test("every chain call returns a new builder", () => {
    const joinable = from("jnt:page", "p").where(({ p }) => p.prop("jcr:title").eq("Home"));
    const calls = [
      base.where((p) => p.prop("a").eq(1)),
      base.whereSlow((p) => p.prop("a").lengthSlow().gtSlow(1)),
      base.orderBy((p) => p.prop("a").asc()),
      base.orderBySlow((p) => p.prop("a").lower().ascSlow()),
      base.select((p) => p.all()),
      base.limit(10),
      base.unboundedSlow(),
      base.offset(10),
      base.bind({ a: 1 }),
    ];

    for (const call of calls) {
      assert.notEqual(call, base);
    }

    // A join names both sides, so it starts from a base that declared an alias.
    assert.notEqual(
      joinable.joinSlow("jnt:content", "c").on(({ c, p }) => c.isChildOf(p)),
      joinable,
    );
  });

  test("the base keeps its own model and execution options", () => {
    const expected = qom.createQuery(
      page,
      qom.comparison(title, Operator.EQUAL_TO, literal("Home")),
    );

    base.where((p) => p.prop("a").eq(1));
    base.orderBy((p) => p.prop("a").asc());
    base.select((p) => p.all());
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
    const built = from("jnt:page")
      .where((p) => p.prop("jcr:title").eq("Home"))
      .limit(10);
    assert.deepEqual(built.build(), built.model);
  });

  test("it rejects a constraint that names an undeclared selector", () => {
    const foreign = qom.comparison(
      qom.propertyValue("q", "jcr:title"),
      Operator.EQUAL_TO,
      literal("Home"),
    );
    const builder = from("jnt:page").where(foreign as unknown as Constraint<"jnt:page", "fast">);
    assert.equal(
      errorCode(() => builder.build()),
      "UNDECLARED_SELECTOR",
    );
  });

  test("strict throws on a none level diagnostic, and the plain build does not", () => {
    // NAME() with LIKE and no case transform fails at execution, see the diagnostics matrix.
    const failing = from("jnt:page")
      .whereSlow((p) => p.name().likeSlow("home%"))
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
    const negated = from("jnt:page")
      .where((p) => not(p.prop("j:published").eq(true)))
      .limit(10);
    const upperCased = from("jnt:page")
      .where((p) => p.prop("jcr:title").upper().eq("HOME"))
      .limit(10);

    assert.deepEqual(negated.build({ strict: true }), negated.model);
    assert.deepEqual(upperCased.build({ strict: true }), upperCased.model);
    assert.deepEqual(
      negated.diagnose().map((finding) => [finding.level, finding.conditional]),
      [["none", true]],
    );
  });

  test("strict lets a query with no none level finding through", () => {
    const fine = from("jnt:page")
      .where((p) => p.prop("jcr:title").eq("Home"))
      .limit(10);
    assert.deepEqual(fine.build({ strict: true }), fine.model);
  });
});

describe("diagnose", () => {
  test("it reads the model and the execution options together", () => {
    const findings = from("jnt:page")
      .where((p) => p.prop("jcr:title").eq("Home"))
      .limit(10)
      .offset(40000)
      .diagnose();

    assert.deepEqual(
      findings.map((finding) => finding.level),
      ["deep-offset", "environment"],
    );
  });

  test("a query with nothing to report gives an empty list", () => {
    assert.deepEqual(from("jnt:page").diagnose(), []);
    assert.deepEqual(
      from("jnt:page")
        .where((p) => p.prop("jcr:title").eq("Home"))
        .limit(10)
        .diagnose(),
      [],
    );
  });

  test("unboundedSlow() reports a full scan of its own", () => {
    const findings = from("jnt:page").unboundedSlow().diagnose();
    assert.deepEqual(
      findings.map((finding) => [finding.level, finding.at]),
      [["full-scan", "execution.limit"]],
    );
  });
});

/**
 * Type fixtures. Every `@ts-expect-error` below is a compile time assertion: the build fails when a
 * type stops rejecting what it must reject, and it fails just as loudly when the error stops being
 * reported, because an unused directive is itself an error.
 */

declare function run(query: Queryable): void;

export function limitStateFixtures(): void {
  const base = from("jnt:page").where((p) => p.prop("jcr:title").eq("Home"));
  const aliased = from("jnt:page", "p").where(({ p }) => p.prop("jcr:title").eq("Home"));

  // A string statement and a builder whose limit was set are both queryable.
  run("SELECT * FROM [jnt:page]");
  run(base.limit(10));
  run(base.unboundedSlow());
  run(base.limit(10).offset(20).bind({ a: 1 }));

  // The rule reads the same on a builder that declared an alias.
  run(aliased.limit(10));

  // @ts-expect-error a builder without a limit is not executable
  run(base);

  // @ts-expect-error an offset does not make a builder executable
  run(base.offset(20));

  // @ts-expect-error the alias changes nothing: a builder without a limit is still not executable
  run(aliased);

  const executable: Executable<"jnt:page"> = base.limit(10);
  const executableAliased: Executable<"p"> = aliased.limit(10);

  // @ts-expect-error the same check through the Executable alias
  const notExecutable: Executable<"jnt:page"> = base;

  // A narrow builder of either shape is assignable to the wide Executable the seams take.
  const wide: Executable = executable;
  const wideAliased: Executable = executableAliased;
  assert.equal(typeof wide, "object");
  assert.equal(typeof wideAliased, "object");
  assert.equal(typeof notExecutable, "object");
}

export function speedFixtures(): void {
  const base = from("jnt:page");

  // @ts-expect-error LENGTH() runs in memory, so the reference has no fast comparison
  base.whereSlow((p) => p.prop("jcr:title").lengthSlow().gt(3));

  // @ts-expect-error a case transform runs in memory in an ordering, so it has no fast ordering
  base.orderBySlow((p) => p.prop("jcr:title").lower().desc());

  // @ts-expect-error NAME() with LIKE is not an index operator, so the reference has no like()
  base.whereSlow((p) => p.name().like("home%"));

  // @ts-expect-error NAME() outside equals runs in memory, so the reference has no gt()
  base.whereSlow((p) => p.name().gt("home"));

  // @ts-expect-error LOCALNAME() outside equals and like runs in memory
  base.whereSlow((p) => p.localName().gt("home"));

  // @ts-expect-error SCORE() runs in memory in a comparison, so the reference has no gt()
  base.whereSlow((p) => p.score().gt(0.5));

  // @ts-expect-error where() takes a fast constraint only
  base.where((p) => p.prop("jcr:title").lengthSlow().gtSlow(3));

  // @ts-expect-error and() propagates the slow speed of its children
  base.where((p) => and(p.prop("jcr:title").eq("Home"), p.name().neSlow("home")));

  // @ts-expect-error or() propagates the slow speed of its children
  base.where((p) => or(p.prop("jcr:title").eq("Home"), p.name().neSlow("home")));

  // @ts-expect-error not() propagates the slow speed of its child
  base.where((p) => not(p.prop("jcr:title").lengthSlow().gtSlow(3)));

  // @ts-expect-error orderBy() takes a fast ordering only
  base.orderBy((p) => p.prop("jcr:title").lower().ascSlow());

  // The speed marker sits on the constraint, so the rule holds on the aliased shape too.
  const aliased = from("jnt:page", "p");

  // @ts-expect-error where() takes a fast constraint only, whatever the callback receives
  aliased.where(({ p }) => p.prop("jcr:title").lengthSlow().gtSlow(3));

  // @ts-expect-error NAME() with LIKE is not an index operator, so the reference has no like()
  aliased.whereSlow(({ p }) => p.name().like("home%"));

  // @ts-expect-error orderBy() takes a fast ordering only, whatever the callback receives
  aliased.orderBy(({ p }) => p.prop("jcr:title").lower().ascSlow());

  aliased.whereSlow(({ p }) => p.prop("jcr:title").lengthSlow().gtSlow(3));
  aliased.whereSlow(({ p }) => p.score().gtSlow(0.5));
  aliased.orderBySlow(({ p }) => p.prop("jcr:title").lower().descSlow());

  // The Slow methods are required where the plan says, and the slow chain calls accept them.
  base.whereSlow((p) => p.prop("jcr:title").lengthSlow().gtSlow(3));
  base.whereSlow((p) => p.name().likeSlow("home%"));
  base.whereSlow((p) => p.score().gtSlow(0.5));
  base.orderBySlow((p) => p.prop("jcr:title").lower().descSlow());
  from("jnt:page", "p")
    .joinSlow("jnt:content", "c")
    .on(({ c, p }) => c.isChildOf(p));
  base.unboundedSlow();

  // The fast chain calls accept every fast construct, facade and factory mixed.
  base.where((p) => and(p.prop("jcr:title").eq("Home"), p.name().eq("home")));
  base.where((p) => or(p.localName().like("home%"), p.fullText("graal*")));
  base.where((p) => not(p.prop("j:published").eq(true)));
  base.where(qom.comparison(title, Operator.EQUAL_TO, literal("Home")));
  base.orderBy((p) => p.score().asc());

  // The folded predicates are built on index operators, so where() takes them all.
  base.where((p) => p.prop("cat").in(["a", "b"]));
  base.where((p) => p.prop("count").between(1, 10));
  base.where((p) => p.prop("jcr:title").startsWith("Home"));
  base.where((p) => p.prop("jcr:title").endsWith("Home"));
  base.where((p) => p.prop("jcr:title").contains("Home"));
  base.where((p) => p.prop("subtitle").notExists());
  base.where((p) => p.prop("jcr:title").lower().in(["home"]));
  base.where((p) => p.prop("jcr:title").lower().between("a", "b"));
  base.where((p) => p.prop("jcr:title").lower().startsWith("ho"));
  base.where((p) => p.prop("jcr:title").lower().endsWith("me"));
  base.where((p) => p.prop("jcr:title").lower().contains("om"));
  base.where((p) => p.name().in(["home"]));
  base.where((p) => p.localName().in(["home"]));
  base.where((p) => p.localName().startsWith("home"));
  base.where((p) => p.localName().endsWith("page"));
  base.where((p) => p.localName().contains("me-pa"));

  // @ts-expect-error isNull() was removed: notExists() is the one name for the absence test
  base.where((p) => p.prop("subtitle").isNull());

  // @ts-expect-error NAME() with LIKE is not an index operator, so the reference has no startsWith()
  base.whereSlow((p) => p.name().startsWith("home"));

  // @ts-expect-error NAME() with LIKE fails at execution, so the reference has no endsWith() either
  base.whereSlow((p) => p.name().endsWith("home"));

  // @ts-expect-error the same holds for contains(), which is a LIKE with two wildcards
  base.whereSlow((p) => p.name().contains("home"));

  // @ts-expect-error a score has no value list, because = on a score runs in memory
  base.whereSlow((p) => p.score().in([0.5]));
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

  // @ts-expect-error columns() was removed, and select() is the one name for it
  base.columns(({ p }) => p.all());

  // @ts-expect-error contains() was renamed fullText(), because it is not a substring match
  base.where(({ p }) => p.contains("graal*"));

  // A join widens the alias union, so both sides are reachable in the callbacks.
  base
    .joinSlow("jnt:content", "c")
    .on(({ c, p }) => c.isChildOf(p))
    .where(({ c }) => c.prop("j:published").eq(true))
    .where(({ p }) => p.prop("jcr:title").eq("Home"));

  // @ts-expect-error the alias "x" is still not declared after the join
  base.joinSlow("jnt:content", "c").on(({ x }) => x.isChildOf(x));
}

export function shapeFixtures(): void {
  const solo = from("jnt:news");
  const aliased = from("jnt:news", "n");

  // Without an alias the callback receives the one reference, which the call site names.
  solo.where((n) => n.prop("jcr:title").eq("Home"));
  solo.orderBy((news) => news.prop("date").desc());
  solo.select((n) => n.all());

  // @ts-expect-error the record shape belongs to a builder that declared an alias
  solo.where(({ n }) => n.prop("jcr:title").eq("Home"));

  // @ts-expect-error an ordering reads the same way, so the record is refused there too
  solo.orderBy(({ n }) => n.prop("date").desc());

  // @ts-expect-error a join names both sides, so it needs from(nodeType, alias)
  solo.joinSlow("jnt:event", "c");

  // With an alias the callback receives the record, keyed by that alias.
  aliased.where(({ n }) => n.prop("jcr:title").eq("Home"));

  // @ts-expect-error the reference shape belongs to a builder that declared no alias
  aliased.where((n) => n.prop("jcr:title").eq("Home"));

  // The shape survives every chain call, so the callbacks read the same after the execution ones.
  solo
    .limit(10)
    .offset(20)
    .bind({ a: 1 })
    .where((n) => n.prop("date").exists());
  aliased
    .limit(10)
    .offset(20)
    .bind({ a: 1 })
    .where(({ n }) => n.prop("date").exists());

  // A join hands the record to every callback that follows it, whatever the shape of its base.
  aliased
    .joinSlow("jnt:event", "c")
    .on(({ c, n }) => c.isChildOf(n))
    .where(({ c }) => c.prop("j:published").eq(true));
}

/**
 * The compile-time half of the disambiguation suite. The rule it pins is the one JCR QOM imposes: a
 * pattern match needs a property, and a full text search is the only construct that reads a whole
 * node. A selector reference therefore carries `fullText()` and no pattern method at all.
 */
export function searchFixtures(): void {
  const base = from("jnt:page", "p");

  // Full text is on both, because it is the one search that a property name may be left out of.
  base.where(({ p }) => p.fullText("graal*"));
  base.where(({ p }) => p.prop("body").fullText("graal*"));

  // Every pattern method is on a property, on a case transform and on a local name.
  base.where(({ p }) => p.prop("jcr:title").contains("graal"));
  base.where(({ p }) => p.prop("jcr:title").lower().contains("graal"));
  base.where(({ p }) => p.localName().contains("graal"));

  // @ts-expect-error a pattern match needs a property, so a selector reference carries no like()
  base.where(({ p }) => p.like("%graal%"));

  // @ts-expect-error the same rule takes startsWith() off the selector reference
  base.where(({ p }) => p.startsWith("graal"));

  // @ts-expect-error and endsWith() with it
  base.where(({ p }) => p.endsWith("graal"));
}

describe("type fixtures", () => {
  test("they compile, which is the assertion", () => {
    for (const fixture of [
      limitStateFixtures,
      speedFixtures,
      selectorFixtures,
      shapeFixtures,
      searchFixtures,
    ]) {
      assert.equal(typeof fixture, "function");
    }
  });
});
