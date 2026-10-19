import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { JoinType, Operator } from "./constants.js";
import { qom, unchecked } from "./factory.js";
import { literal } from "./literal.js";
import type { Column, Constraint, Join, Operand, Ordering, QueryModel, Source } from "./model.js";

/**
 * Type fixtures. Every `@ts-expect-error` below is a compile time assertion: the build fails when a
 * type stops rejecting what it must reject, and it fails just as loudly when the error stops being
 * reported, because an unused directive is itself an error.
 *
 * Each directive sits directly above the expression it concerns, and the checked expressions live
 * in a function that nothing calls, because they are compiled and not run.
 */

const title = qom.propertyValue("p", "jcr:title");
const foreign = qom.propertyValue("q", "jcr:title");
const looseSelectorName: string = "p";

/** Stands in for the facade's `where()`, which takes a fast constraint on the declared aliases. */
function whereOnPage(constraint: Constraint<"p", "fast">): Constraint<"p", "fast"> {
  return constraint;
}

/** Stands in for the facade's `whereSlow()`, which takes a constraint of any speed. */
function whereSlowOnPage(constraint: Constraint<"p">): Constraint<"p"> {
  return constraint;
}

/** Stands in for the facade's `orderBy()`, which takes a fast ordering. */
function orderByOnPage(ordering: Ordering<"p", "fast">): Ordering<"p", "fast"> {
  return ordering;
}

function takesColumn(column: Column<"p">): Column<"p"> {
  return column;
}

function takesSource(source: Source<"p" | "c">): Source<"p" | "c"> {
  return source;
}

export function operandFixtures(): void {
  // The fast comparison takes a property value, and a case transform over one, with any operator.
  qom.comparison(title, Operator.GREATER_THAN, literal(3));
  qom.comparison(qom.lowerCase(title), Operator.LIKE, literal("a%"));
  qom.comparison(qom.upperCase(qom.lowerCase(title)), Operator.EQUAL_TO, literal("A"));

  // @ts-expect-error LENGTH() runs in memory, so it needs comparisonSlow
  qom.comparison(qom.lengthSlow(title), Operator.EQUAL_TO, literal(3));

  // @ts-expect-error SCORE() runs in memory in a comparison, so it needs comparisonSlow
  qom.comparison(qom.fullTextSearchScore("p"), Operator.GREATER_THAN, literal(0.5));

  // The index serves NAME() with equals, and LOCALNAME() with equals or like.
  qom.comparison(qom.nodeName("p"), Operator.EQUAL_TO, literal("home"));
  qom.comparison(qom.nodeLocalName("p"), Operator.EQUAL_TO, literal("home"));
  qom.comparison(qom.nodeLocalName("p"), Operator.LIKE, literal("home%"));

  // @ts-expect-error NAME() with LIKE fails at execution
  qom.comparison(qom.nodeName("p"), Operator.LIKE, literal("home%"));

  // @ts-expect-error NAME() outside equals runs in memory
  qom.comparison(qom.nodeName("p"), Operator.GREATER_THAN, literal("home"));

  // @ts-expect-error LOCALNAME() outside equals and like runs in memory
  qom.comparison(qom.nodeLocalName("p"), Operator.GREATER_THAN, literal("home"));

  // @ts-expect-error a case transform over NAME() runs in memory
  qom.comparison(qom.lowerCase(qom.nodeName("p")), Operator.EQUAL_TO, literal("home"));

  // The slow comparison takes every pair the fast one rejects.
  qom.comparisonSlow(qom.lengthSlow(title), Operator.GREATER_THAN, literal(3));
  qom.comparisonSlow(qom.nodeName("p"), Operator.LIKE, literal("home%"));

  // `Operand` is the common supertype of the two families, per the spec interface of that name.
  const operands: Operand<"p">[] = [literal("Home"), qom.bindVariable("since"), title];
  assert.equal(operands.length, 3);
}

export function orderingFixtures(): void {
  // The fast ordering takes a property value or the search score.
  orderByOnPage(qom.ascending(title));
  orderByOnPage(qom.descending(qom.fullTextSearchScore("p")));

  // @ts-expect-error an ordering on LENGTH() needs ascendingSlow
  qom.ascending(qom.lengthSlow(title));

  // @ts-expect-error an ordering on LOWER() needs descendingSlow
  qom.descending(qom.lowerCase(title));

  const slowOrdering = qom.ascendingSlow(qom.lowerCase(title));

  // @ts-expect-error a slow ordering is not a fast one
  orderByOnPage(slowOrdering);
}

export function columnFixtures(): void {
  // A column selects every property, or one property under an optional column name.
  takesColumn(qom.column("p"));
  takesColumn(qom.column("p", "jcr:title"));
  takesColumn(qom.column("p", "jcr:title", "pageTitle"));

  // @ts-expect-error a column name needs a property name
  qom.column("p", null, "pageTitle");

  const badColumn = { kind: "Column", selectorName: "p", propertyName: null, columnName: "alias" };

  // @ts-expect-error a column name needs a property name
  takesColumn(badColumn);
}

export function selectorFixtures(): void {
  // A constraint on a declared alias is accepted.
  whereOnPage(qom.comparison(title, Operator.EQUAL_TO, literal("Home")));

  const onForeignSelector = qom.comparison(foreign, Operator.EQUAL_TO, literal("Home"));

  // @ts-expect-error the selector "q" is not declared by this query
  whereOnPage(onForeignSelector);

  const onLooseSelector = qom.comparison(
    qom.propertyValue(looseSelectorName, "jcr:title"),
    Operator.EQUAL_TO,
    literal("Home"),
  );

  // @ts-expect-error a selector name held in a string variable needs unchecked()
  whereOnPage(onLooseSelector);

  // unchecked() is the escape hatch, and build() then resolves the name.
  whereOnPage(unchecked<"p">(onLooseSelector));

  const onLooseSlowSelector = qom.comparisonSlow(
    qom.lengthSlow(qom.propertyValue(looseSelectorName, "jcr:title")),
    Operator.GREATER_THAN,
    literal(3),
  );

  // One type argument is enough for a slow constraint too, because unchecked() keeps the speed.
  whereSlowOnPage(unchecked<"p">(onLooseSlowSelector));

  // @ts-expect-error unchecked() keeps a slow constraint slow, so where() still rejects it
  whereOnPage(unchecked<"p">(onLooseSlowSelector));

  // @ts-expect-error the query is declared over the selector "p" only
  qom.createQuery<"p">(qom.selector("jnt:page", "p"), onForeignSelector);

  // A narrow query model is assignable to the wide one, which the seams take.
  const narrow: QueryModel<"p"> = qom.createQuery(qom.selector("jnt:page", "p"));
  const wide: QueryModel = narrow;
  takesSource(wide.source as Source<"p" | "c">);
}

export function speedFixtures(): void {
  const slowComparison = qom.comparisonSlow(
    qom.lengthSlow(title),
    Operator.GREATER_THAN,
    literal(3),
  );

  // @ts-expect-error a slow comparison is not a fast constraint
  whereOnPage(slowComparison);

  const mixed = qom.and(qom.comparison(title, Operator.EQUAL_TO, literal("Home")), slowComparison);

  // @ts-expect-error and() propagates the slow speed of its operands
  whereOnPage(mixed);

  // and() over two fast constraints stays fast, and a constraint with no speed of its own is fast.
  whereOnPage(
    qom.and(
      qom.comparison(title, Operator.EQUAL_TO, literal("Home")),
      qom.not(qom.propertyExistence("p", "j:published")),
    ),
  );
}

export function joinFixtures(): void {
  const join: Join<"p" | "c", "slow"> = qom.joinSlow(
    qom.selector("jnt:page", "p"),
    qom.selector("jnt:content", "c"),
    JoinType.INNER,
    qom.childNodeJoinCondition("c", "p"),
  );

  // A join widens the selector union to both sides.
  takesSource(join);

  qom.joinSlow(
    qom.selector("jnt:page", "p"),
    qom.selector("jnt:content", "c"),
    JoinType.INNER,
    // @ts-expect-error the join condition may only name the two joined selectors
    qom.childNodeJoinCondition("x", "p"),
  );
}

describe("type fixtures", () => {
  test("they compile, which is the assertion", () => {
    for (const fixture of [
      operandFixtures,
      orderingFixtures,
      columnFixtures,
      selectorFixtures,
      speedFixtures,
      joinFixtures,
    ]) {
      assert.equal(typeof fixture, "function");
    }
  });
});
