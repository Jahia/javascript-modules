import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { JoinType, Operator, Order } from "./constants.js";
import { qom, unchecked } from "./factory.js";
import { $, literal } from "./literal.js";
import type { Constraint, DynamicOperand, PropertyValue, Selector } from "./model.js";
import { QueryError, validateModel } from "./validate.js";

function errorCode(run: () => unknown): string | undefined {
  try {
    run();
    return undefined;
  } catch (error) {
    return error instanceof QueryError ? error.code : `not a QueryError: ${String(error)}`;
  }
}

const title: PropertyValue<"p"> = qom.propertyValue("p", "jcr:title");

describe("qom.selector", () => {
  test("it keeps the node type name as the selector name by default", () => {
    assert.deepEqual(qom.selector("jnt:page"), {
      kind: "Selector",
      nodeTypeName: "jnt:page",
      selectorName: "jnt:page",
    });
  });

  test("it takes an explicit selector name", () => {
    assert.deepEqual(qom.selector("jnt:page", "p"), {
      kind: "Selector",
      nodeTypeName: "jnt:page",
      selectorName: "p",
    });
  });

  test("it checks both names against the JCR name grammar", () => {
    assert.equal(
      errorCode(() => qom.selector("jnt page/x")),
      "INVALID_NAME",
    );
    assert.equal(
      errorCode(() => qom.selector("jnt:page", "a|b")),
      "INVALID_NAME",
    );
  });
});

describe("qom.joinSlow and the join conditions", () => {
  const page = qom.selector("jnt:page", "p");
  const content = qom.selector("jnt:content", "c");

  test("it builds a join with the Java parameter order", () => {
    const condition = qom.childNodeJoinCondition("c", "p");
    assert.deepEqual(qom.joinSlow(page, content, JoinType.INNER, condition), {
      kind: "Join",
      left: page,
      right: content,
      joinType: "jcr.join.type.inner",
      joinCondition: condition,
    });
  });

  test("it rejects an unknown join type and a missing condition", () => {
    const condition = qom.childNodeJoinCondition("c", "p");
    assert.equal(
      errorCode(() =>
        qom.joinSlow(page, content, "jcr.join.type.cross" as unknown as JoinType, condition),
      ),
      "UNSUPPORTED",
    );
    assert.equal(
      errorCode(() =>
        qom.joinSlow(page, content, JoinType.INNER, null as unknown as typeof condition),
      ),
      "MISSING_JOIN_CONDITION",
    );
  });

  test("equiJoinCondition carries two selectors and two properties", () => {
    assert.deepEqual(qom.equiJoinCondition("p", "jcr:uuid", "c", "j:parent"), {
      kind: "EquiJoinCondition",
      selector1Name: "p",
      property1Name: "jcr:uuid",
      selector2Name: "c",
      property2Name: "j:parent",
    });
    assert.equal(
      errorCode(() => qom.equiJoinCondition("p", "a/b", "c", "d")),
      "INVALID_NAME",
    );
  });

  test("sameNodeJoinCondition defaults its path to the self path", () => {
    assert.deepEqual(qom.sameNodeJoinCondition("p", "c"), {
      kind: "SameNodeJoinCondition",
      selector1Name: "p",
      selector2Name: "c",
      selector2Path: ".",
    });
    assert.equal(qom.sameNodeJoinCondition("p", "c", "child").selector2Path, "child");
    assert.equal(
      errorCode(() => qom.sameNodeJoinCondition("p", "c", "//")),
      "INVALID_PATH",
    );
  });

  test("childNodeJoinCondition and descendantNodeJoinCondition keep the Java field names", () => {
    assert.deepEqual(qom.childNodeJoinCondition("c", "p"), {
      kind: "ChildNodeJoinCondition",
      childSelectorName: "c",
      parentSelectorName: "p",
    });
    assert.deepEqual(qom.descendantNodeJoinCondition("c", "p"), {
      kind: "DescendantNodeJoinCondition",
      descendantSelectorName: "c",
      ancestorSelectorName: "p",
    });
  });
});

describe("qom.and, qom.or and qom.not", () => {
  const published = qom.propertyExistence("p", "j:published");
  const home = qom.comparison(title, Operator.EQUAL_TO, literal("Home"));

  test("and and or stay binary", () => {
    assert.deepEqual(qom.and(published, home), {
      kind: "And",
      constraint1: published,
      constraint2: home,
    });
    assert.deepEqual(qom.or(published, home), {
      kind: "Or",
      constraint1: published,
      constraint2: home,
    });
  });

  test("not wraps one constraint", () => {
    assert.deepEqual(qom.not(published), { kind: "Not", constraint: published });
  });

  test("a missing constraint throws NULL_CONSTRAINT, as Jackrabbit does", () => {
    const missing = null as unknown as typeof published;
    assert.equal(
      errorCode(() => qom.and(missing, home)),
      "NULL_CONSTRAINT",
    );
    assert.equal(
      errorCode(() => qom.or(home, missing)),
      "NULL_CONSTRAINT",
    );
    assert.equal(
      errorCode(() => qom.not(missing)),
      "NULL_CONSTRAINT",
    );
  });
});

describe("qom.comparison and qom.comparisonSlow", () => {
  test("the fast form builds a comparison on a property value", () => {
    assert.deepEqual(qom.comparison(title, Operator.LIKE, literal("A%")), {
      kind: "Comparison",
      operand1: title,
      operator: "jcr.operator.like",
      operand2: { kind: "Literal", type: "String", value: "A%" },
    });
  });

  test("the fast form takes a case transform over a property value", () => {
    const lower = qom.lowerCase(title);
    assert.equal(
      qom.comparison(lower, Operator.EQUAL_TO, literal("home")).operand1.kind,
      "LowerCase",
    );
  });

  test("the fast form takes NAME with equals and LOCALNAME with equals or like", () => {
    assert.equal(
      qom.comparison(qom.nodeName("p"), Operator.EQUAL_TO, literal("home")).operator,
      "jcr.operator.equal.to",
    );
    assert.equal(
      qom.comparison(qom.nodeLocalName("p"), Operator.LIKE, literal("home%")).operator,
      "jcr.operator.like",
    );
  });

  test("the slow form takes any operand with any operator", () => {
    const length = qom.lengthSlow(title);
    assert.deepEqual(qom.comparisonSlow(length, Operator.GREATER_THAN, literal(3)), {
      kind: "Comparison",
      operand1: length,
      operator: "jcr.operator.greater.than",
      operand2: { kind: "Literal", type: "Long", value: "3" },
    });
  });

  test("an unknown operator and a missing operand are rejected", () => {
    assert.equal(
      errorCode(() =>
        qom.comparison(title, "jcr.operator.matches" as unknown as Operator, literal("x")),
      ),
      "UNSUPPORTED",
    );
    assert.equal(
      errorCode(() => qom.comparison(null as unknown as typeof title, Operator.LIKE, literal("x"))),
      "UNSUPPORTED",
    );
  });

  test("a bind variable is a valid second operand", () => {
    assert.deepEqual(qom.comparison(title, Operator.EQUAL_TO, $("wanted")).operand2, {
      kind: "BindVariableValue",
      bindVariableName: "wanted",
    });
  });
});

describe("the node constraints", () => {
  test("propertyExistence names a selector and a property", () => {
    assert.deepEqual(qom.propertyExistence("p", "j:published"), {
      kind: "PropertyExistence",
      selectorName: "p",
      propertyName: "j:published",
    });
  });

  test("fullTextSearch keeps an explicit null property name", () => {
    assert.deepEqual(qom.fullTextSearch("p", null, literal("graal*")), {
      kind: "FullTextSearch",
      selectorName: "p",
      propertyName: null,
      fullTextSearchExpression: { kind: "Literal", type: "String", value: "graal*" },
    });
    assert.equal(qom.fullTextSearch("p", "jcr:title", literal("graal*")).propertyName, "jcr:title");
    assert.equal(
      errorCode(() => qom.fullTextSearch("p", "a/b", literal("x"))),
      "INVALID_NAME",
    );
  });

  test("sameNode, childNode and descendantNode need an absolute path", () => {
    assert.deepEqual(qom.sameNode("p", "/sites/acme"), {
      kind: "SameNode",
      selectorName: "p",
      path: "/sites/acme",
    });
    assert.deepEqual(qom.childNode("p", "/sites/acme"), {
      kind: "ChildNode",
      selectorName: "p",
      parentPath: "/sites/acme",
    });
    assert.deepEqual(qom.descendantNode("p", "/"), {
      kind: "DescendantNode",
      selectorName: "p",
      ancestorPath: "/",
    });

    assert.equal(
      errorCode(() => qom.sameNode("p", "sites/acme")),
      "INVALID_PATH",
    );
    assert.equal(
      errorCode(() => qom.childNode("p", ".")),
      "INVALID_PATH",
    );
    assert.equal(
      errorCode(() => qom.descendantNode("p", "/sites//acme")),
      "INVALID_PATH",
    );
  });
});

describe("the dynamic operands", () => {
  test("propertyValue names a selector and a property", () => {
    assert.deepEqual(title, {
      kind: "PropertyValue",
      selectorName: "p",
      propertyName: "jcr:title",
    });
    assert.equal(
      errorCode(() => qom.propertyValue("p", "a]b")),
      "INVALID_NAME",
    );
  });

  test("lengthSlow accepts a property value only", () => {
    assert.deepEqual(qom.lengthSlow(title), { kind: "Length", propertyValue: title });
    assert.equal(
      errorCode(() => qom.lengthSlow(qom.nodeName("p") as unknown as PropertyValue<"p">)),
      "UNSUPPORTED",
    );
  });

  test("nodeName, nodeLocalName and fullTextSearchScore name a selector", () => {
    assert.deepEqual(qom.nodeName("p"), { kind: "NodeName", selectorName: "p" });
    assert.deepEqual(qom.nodeLocalName("p"), { kind: "NodeLocalName", selectorName: "p" });
    assert.deepEqual(qom.fullTextSearchScore("p"), {
      kind: "FullTextSearchScore",
      selectorName: "p",
    });
  });

  test("lowerCase and upperCase wrap any dynamic operand", () => {
    assert.deepEqual(qom.lowerCase(title), { kind: "LowerCase", operand: title });
    assert.deepEqual(qom.upperCase(qom.nodeName("p")), {
      kind: "UpperCase",
      operand: { kind: "NodeName", selectorName: "p" },
    });
    assert.equal(
      errorCode(() => qom.lowerCase(undefined as unknown as DynamicOperand)),
      "UNSUPPORTED",
    );
  });

  test("bindVariable and literal are reachable from the factory too", () => {
    assert.deepEqual(qom.bindVariable("since"), {
      kind: "BindVariableValue",
      bindVariableName: "since",
    });
    assert.deepEqual(qom.literal(true), { kind: "Literal", type: "Boolean", value: "true" });
  });
});

describe("the orderings", () => {
  test("the fast forms carry the order constants", () => {
    assert.deepEqual(qom.ascending(title), {
      kind: "Ordering",
      operand: title,
      order: Order.ASCENDING,
    });
    assert.deepEqual(qom.descending(qom.fullTextSearchScore("p")), {
      kind: "Ordering",
      operand: { kind: "FullTextSearchScore", selectorName: "p" },
      order: Order.DESCENDING,
    });
  });

  test("the slow forms take any dynamic operand", () => {
    const lower = qom.lowerCase(title);
    assert.equal(qom.ascendingSlow(lower).order, "jcr.order.ascending");
    assert.equal(qom.descendingSlow(lower).order, "jcr.order.descending");
  });

  test("a missing operand is rejected", () => {
    assert.equal(
      errorCode(() => qom.ascending(null as unknown as PropertyValue<"p">)),
      "UNSUPPORTED",
    );
  });
});

describe("qom.column", () => {
  test("one argument selects every property of the selector", () => {
    assert.deepEqual(qom.column("p"), {
      kind: "Column",
      selectorName: "p",
      propertyName: null,
      columnName: null,
    });
  });

  test("a property name without a column name leaves the column name null", () => {
    assert.deepEqual(qom.column("p", "jcr:title"), {
      kind: "Column",
      selectorName: "p",
      propertyName: "jcr:title",
      columnName: null,
    });
  });

  test("a property name and a column name are both kept", () => {
    assert.deepEqual(qom.column("c", "jcr:title", "childTitle"), {
      kind: "Column",
      selectorName: "c",
      propertyName: "jcr:title",
      columnName: "childTitle",
    });
  });

  test("the looser grammar keeps the Jahia extensions expressible as column names", () => {
    assert.equal(
      qom.column("p", "count", "rep:count(approximate=1)").columnName,
      "rep:count(approximate=1)",
    );
    assert.equal(
      qom.column("p", "j:tags", "rep:facet(nodetype=jnt:news&key=j:tags)").columnName,
      "rep:facet(nodetype=jnt:news&key=j:tags)",
    );
  });

  // Jahia reads `rep:facet(` off `Column.getColumnName()`, and its own count query is written as
  // `SELECT count AS [rep:count(skipChecks=1)]`, so the property name keeps the JCR name grammar.
  // That grammar allows parentheses, so `rep:count()` stays a property name; a nested prefix such
  // as `jnt:news` inside the argument list does not.
  test("a property name outside the JCR name grammar throws INVALID_NAME", () => {
    assert.equal(
      errorCode(() => qom.column("p", "rep:facet(nodetype=jnt:news&key=j:tags)")),
      "INVALID_NAME",
    );
    assert.equal(
      errorCode(() => qom.column("p", "a|b")),
      "INVALID_NAME",
    );
    assert.equal(qom.column("p", "rep:count()").propertyName, "rep:count()");
  });

  test("a column name without a property name throws INVALID_COLUMN", () => {
    assert.equal(
      errorCode(() => qom.column("p", null as unknown as string, "alias")),
      "INVALID_COLUMN",
    );
    assert.equal(
      errorCode(() => qom.column("p", "jcr:title", "a]b")),
      "INVALID_COLUMN",
    );
  });
});

describe("qom.createQuery", () => {
  test("it defaults the constraint, the orderings and the columns", () => {
    const source = qom.selector("jnt:page", "p");
    assert.deepEqual(qom.createQuery(source), {
      kind: "QueryObjectModel",
      source,
      constraint: null,
      orderings: [],
      columns: [],
    });
  });

  test("the model survives a JSON round trip, phantom markers included", () => {
    const model = qom.createQuery(
      qom.selector("jnt:page", "p"),
      qom.and(
        qom.comparison(title, Operator.EQUAL_TO, literal("Home")),
        qom.not(qom.propertyExistence("p", "j:published")),
      ),
      [qom.descending(title)],
      [qom.column("p")],
    );

    assert.deepEqual(JSON.parse(JSON.stringify(model)), model);
    assert.equal(JSON.stringify(model).includes("speed"), false);
  });

  test("it leaves the cross-node checks to build time", () => {
    const model = qom.createQuery<"p" | "q">(
      qom.selector("jnt:page", "p"),
      null,
      [],
      [qom.column("q")],
    );
    assert.equal(model.columns[0].selectorName, "q");
    assert.equal(
      errorCode(() => validateModel(model)),
      "UNDECLARED_SELECTOR",
    );
  });

  test("it still rejects a missing source", () => {
    assert.equal(
      errorCode(() => qom.createQuery(null as unknown as Selector<"p">)),
      "UNSUPPORTED",
    );
  });
});

describe("unchecked", () => {
  test("it widens the selector names and keeps the speed", () => {
    const alias: string = "p";
    const loose: Constraint<string, "fast"> = qom.comparison(
      qom.propertyValue(alias, "jcr:title"),
      Operator.EQUAL_TO,
      literal("Home"),
    );
    const narrowed: Constraint<"p", "fast"> = unchecked<"p">(loose);
    assert.equal(narrowed, loose);
  });

  test("it still rejects a missing constraint", () => {
    assert.equal(
      errorCode(() => unchecked(null as unknown as Constraint<string>)),
      "NULL_CONSTRAINT",
    );
  });
});
