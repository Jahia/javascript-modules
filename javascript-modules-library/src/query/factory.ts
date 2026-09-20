import { JoinType, Operator, Order } from "./constants.js";
import { bindVariable, literal } from "./literal.js";
import type {
  And,
  ChildNode,
  ChildNodeJoinCondition,
  Column,
  Comparison,
  Constraint,
  DescendantNode,
  DescendantNodeJoinCondition,
  DynamicOperand,
  EquiJoinCondition,
  FastOperand,
  FullTextSearch,
  FullTextSearchScore,
  Join,
  JoinCondition,
  Length,
  LowerCase,
  NodeLocalName,
  NodeName,
  Not,
  Or,
  Ordering,
  PropertyExistence,
  PropertyValue,
  QueryModel,
  SameNode,
  SameNodeJoinCondition,
  Selector,
  Source,
  Speed,
  StaticOperand,
  UpperCase,
} from "./model.js";
import {
  QueryError,
  assertAbsolutePath,
  assertColumnPart,
  assertName,
  assertPath,
} from "./validate.js";

/**
 * The factory layer. One pure function per method of `javax.jcr.query.qom.QueryObjectModelFactory`,
 * with the Java parameter order and the Java semantics.
 *
 * Five names differ from Java, because every query that holds their output runs in memory:
 * `joinSlow`, `lengthSlow`, `comparisonSlow`, `ascendingSlow` and `descendingSlow`. The name is the
 * performance warning, so no runtime warning exists.
 *
 * Every function checks its own arguments and throws a `QueryError`. Checks that need the whole
 * query, such as resolving a selector name, run at build time in `validateModel()`.
 */

const OPERATORS: ReadonlySet<string> = new Set(Object.values(Operator));
const JOIN_TYPES: ReadonlySet<string> = new Set(Object.values(JoinType));

function assertConstraint(constraint: unknown, what: string, at: string): void {
  if (!constraint || typeof constraint !== "object") {
    throw new QueryError(
      "NULL_CONSTRAINT",
      `${what} must be a constraint, got ${String(constraint)}`,
      at,
    );
  }
}

function assertOperand(operand: unknown, what: string, at: string): void {
  if (!operand || typeof operand !== "object") {
    throw new QueryError("UNSUPPORTED", `${what} must be an operand, got ${String(operand)}`, at);
  }
}

function assertOperator(operator: string, at: string): void {
  if (!OPERATORS.has(operator)) {
    throw new QueryError("UNSUPPORTED", `Unknown operator ${JSON.stringify(operator)}`, at);
  }
}

/*
 * Source.
 */

/**
 * A node type and the name the query refers to it by. The name defaults to the node type name, and
 * the formatter then omits the `AS` clause.
 *
 * @remarks
 *   Jahia support: runs on the index.
 */
function selector<T extends string, S extends string = T>(
  nodeTypeName: T,
  selectorName?: S,
): Selector<S> {
  assertName(nodeTypeName, "A node type name", "selector.nodeTypeName");
  if (selectorName !== undefined) {
    assertName(selectorName, "A selector name", "selector.selectorName");
  }

  return {
    kind: "Selector",
    nodeTypeName,
    selectorName: (selectorName ?? nodeTypeName) as S,
  };
}

/**
 * Joins two sources. Named `Slow` because Jahia's engine runs every join in memory: both sides run
 * with offset 0 and limit -1, and the merged rows are sliced afterwards.
 *
 * @remarks
 *   Jahia support: runs in memory, and no limit reaches Lucene. A `RIGHT OUTER` join runs as a `LEFT
 *   OUTER` one with the sides swapped.
 */
function joinSlow<L extends string, R extends string>(
  left: Source<L>,
  right: Source<R>,
  joinType: JoinType,
  joinCondition: JoinCondition<L | R>,
): Join<L | R, "slow"> {
  assertOperand(left, "The left side of a join", "join.left");
  assertOperand(right, "The right side of a join", "join.right");
  if (!JOIN_TYPES.has(joinType)) {
    throw new QueryError("UNSUPPORTED", `Unknown join type ${JSON.stringify(joinType)}`, "join");
  }

  if (!joinCondition) {
    throw new QueryError("MISSING_JOIN_CONDITION", "A join needs a join condition", "join");
  }

  return { kind: "Join", left, right, joinType, joinCondition };
}

/*
 * Join conditions.
 */

/**
 * Joins two selectors on the value of one property each.
 *
 * @remarks
 *   Jahia support: runs in memory, like every join condition.
 */
function equiJoinCondition<S1 extends string, S2 extends string>(
  selector1Name: S1,
  property1Name: string,
  selector2Name: S2,
  property2Name: string,
): EquiJoinCondition<S1 | S2> {
  assertName(selector1Name, "A selector name", "equiJoinCondition.selector1Name");
  assertName(property1Name, "A property name", "equiJoinCondition.property1Name");
  assertName(selector2Name, "A selector name", "equiJoinCondition.selector2Name");
  assertName(property2Name, "A property name", "equiJoinCondition.property2Name");

  return {
    kind: "EquiJoinCondition",
    selector1Name,
    property1Name,
    selector2Name,
    property2Name,
  };
}

/**
 * Joins two selectors on node identity. `selector2Path` is a path relative to the node of
 * `selector1Name`, and it defaults to `"."`, which is what the Parser writes. The fork factory
 * rejects a null path, so the parameter has no null form.
 *
 * @remarks
 *   Jahia support: runs in memory, like every join condition.
 */
function sameNodeJoinCondition<S1 extends string, S2 extends string>(
  selector1Name: S1,
  selector2Name: S2,
  selector2Path = ".",
): SameNodeJoinCondition<S1 | S2> {
  assertName(selector1Name, "A selector name", "sameNodeJoinCondition.selector1Name");
  assertName(selector2Name, "A selector name", "sameNodeJoinCondition.selector2Name");
  assertPath(selector2Path, "A join path", "sameNodeJoinCondition.selector2Path");

  return { kind: "SameNodeJoinCondition", selector1Name, selector2Name, selector2Path };
}

/**
 * Joins a child selector to its parent selector.
 *
 * @remarks
 *   Jahia support: runs in memory, like every join condition.
 */
function childNodeJoinCondition<C extends string, P extends string>(
  childSelectorName: C,
  parentSelectorName: P,
): ChildNodeJoinCondition<C | P> {
  assertName(childSelectorName, "A selector name", "childNodeJoinCondition.childSelectorName");
  assertName(parentSelectorName, "A selector name", "childNodeJoinCondition.parentSelectorName");

  return { kind: "ChildNodeJoinCondition", childSelectorName, parentSelectorName };
}

/**
 * Joins a descendant selector to one of its ancestor selectors.
 *
 * @remarks
 *   Jahia support: runs in memory, like every join condition.
 */
function descendantNodeJoinCondition<D extends string, A extends string>(
  descendantSelectorName: D,
  ancestorSelectorName: A,
): DescendantNodeJoinCondition<D | A> {
  assertName(
    descendantSelectorName,
    "A selector name",
    "descendantNodeJoinCondition.descendantSelectorName",
  );
  assertName(
    ancestorSelectorName,
    "A selector name",
    "descendantNodeJoinCondition.ancestorSelectorName",
  );

  return { kind: "DescendantNodeJoinCondition", descendantSelectorName, ancestorSelectorName };
}

/*
 * Constraints.
 */

/**
 * Both constraints must hold. The function stays binary, as Java has it, and it throws
 * `NULL_CONSTRAINT` on a missing side, as Jackrabbit does.
 *
 * @remarks
 *   Jahia support: runs on the index when both sides do.
 */
function and<
  A extends string,
  B extends string,
  P1 extends Speed = "fast",
  P2 extends Speed = "fast",
>(constraint1: Constraint<A, P1>, constraint2: Constraint<B, P2>): And<A | B, P1 | P2> {
  assertConstraint(constraint1, "The first operand of and()", "and.constraint1");
  assertConstraint(constraint2, "The second operand of and()", "and.constraint2");

  return { kind: "And", constraint1, constraint2 };
}

/**
 * At least one of the two constraints must hold.
 *
 * @remarks
 *   Jahia support: runs on the index when both sides do.
 */
function or<
  A extends string,
  B extends string,
  P1 extends Speed = "fast",
  P2 extends Speed = "fast",
>(constraint1: Constraint<A, P1>, constraint2: Constraint<B, P2>): Or<A | B, P1 | P2> {
  assertConstraint(constraint1, "The first operand of or()", "or.constraint1");
  assertConstraint(constraint2, "The second operand of or()", "or.constraint2");

  return { kind: "Or", constraint1, constraint2 };
}

/**
 * The constraint must not hold. The Parser reads `NOT a AND b` as `NOT (a AND b)`, so the formatter
 * writes parentheses around a `NOT` child of an `AND`.
 *
 * @remarks
 *   Jahia support: runs on the index. In a localised session, a `NOT` around a property that the
 *   rewriter moves to a `jnt:translation` selector makes the query fail, see `diagnose()`.
 */
function not<A extends string, P extends Speed = "fast">(constraint: Constraint<A, P>): Not<A, P> {
  assertConstraint(constraint, "The operand of not()", "not.constraint");

  return { kind: "Not", constraint };
}

/**
 * Compares an operand Jackrabbit resolves on the index with a static operand.
 *
 * The three signatures are the operand and operator pairs the index serves: any operator over a
 * property value or a case transform of one, `=` over `NAME()`, and `=` or `LIKE` over
 * `LOCALNAME()`. Everything else needs `comparisonSlow`.
 *
 * @remarks
 *   Jahia support: runs on the index.
 */
function comparison<S extends string>(
  operand1: FastOperand<S>,
  operator: Operator,
  operand2: StaticOperand,
): Comparison<S, "fast">;
function comparison<S extends string>(
  operand1: NodeName<S>,
  operator: typeof Operator.EQUAL_TO,
  operand2: StaticOperand,
): Comparison<S, "fast">;
function comparison<S extends string>(
  operand1: NodeLocalName<S>,
  operator: typeof Operator.EQUAL_TO | typeof Operator.LIKE,
  operand2: StaticOperand,
): Comparison<S, "fast">;
function comparison<S extends string>(
  operand1: DynamicOperand<S>,
  operator: Operator,
  operand2: StaticOperand,
): Comparison<S, "fast"> {
  return buildComparison<S, "fast">(operand1, operator, operand2);
}

/**
 * Compares any dynamic operand with any operator. Named `Slow` because Jackrabbit evaluates the
 * pairs this function adds as a `RowPredicate`, which loads one node per scanned hit.
 *
 * @remarks
 *   Jahia support: runs in memory for `LENGTH()`, `SCORE()`, and `NAME()` or `LOCALNAME()` outside
 *   their index operators or under a case transform. `NAME()` with `LIKE` and no transform fails,
 *   see `diagnose()`.
 */
function comparisonSlow<S extends string>(
  operand1: DynamicOperand<S>,
  operator: Operator,
  operand2: StaticOperand,
): Comparison<S, "slow"> {
  return buildComparison<S, "slow">(operand1, operator, operand2);
}

function buildComparison<S extends string, P extends Speed>(
  operand1: DynamicOperand<S>,
  operator: Operator,
  operand2: StaticOperand,
): Comparison<S, P> {
  assertOperand(operand1, "The first operand of a comparison", "comparison.operand1");
  assertOperator(operator, "comparison.operator");
  assertOperand(operand2, "The second operand of a comparison", "comparison.operand2");

  return { kind: "Comparison", operand1, operator, operand2 };
}

/**
 * The node must have the property.
 *
 * @remarks
 *   Jahia support: runs on the index.
 */
function propertyExistence<S extends string>(
  selectorName: S,
  propertyName: string,
): PropertyExistence<S> {
  assertName(selectorName, "A selector name", "propertyExistence.selectorName");
  assertName(propertyName, "A property name", "propertyExistence.propertyName");

  return { kind: "PropertyExistence", selectorName, propertyName };
}

/**
 * Full text search over one property, or over every property of the node when `propertyName` is
 * `null`.
 *
 * @remarks
 *   Jahia support: runs on the index, and `ORDER BY SCORE()` over it is native.
 */
function fullTextSearch<S extends string>(
  selectorName: S,
  propertyName: string | null,
  fullTextSearchExpression: StaticOperand,
): FullTextSearch<S> {
  assertName(selectorName, "A selector name", "fullTextSearch.selectorName");
  if (propertyName !== null) {
    assertName(propertyName, "A property name", "fullTextSearch.propertyName");
  }

  assertOperand(
    fullTextSearchExpression,
    "A full text search expression",
    "fullTextSearch.fullTextSearchExpression",
  );

  return { kind: "FullTextSearch", selectorName, propertyName, fullTextSearchExpression };
}

/**
 * The node must be the node at the given absolute path.
 *
 * @remarks
 *   Jahia support: runs on the index.
 */
function sameNode<S extends string>(selectorName: S, path: string): SameNode<S> {
  assertName(selectorName, "A selector name", "sameNode.selectorName");
  assertAbsolutePath(path, "A node path", "sameNode.path");

  return { kind: "SameNode", selectorName, path };
}

/**
 * The node must be a child of the node at the given absolute path.
 *
 * @remarks
 *   Jahia support: runs on the index.
 */
function childNode<S extends string>(selectorName: S, parentPath: string): ChildNode<S> {
  assertName(selectorName, "A selector name", "childNode.selectorName");
  assertAbsolutePath(parentPath, "A parent path", "childNode.parentPath");

  return { kind: "ChildNode", selectorName, parentPath };
}

/**
 * The node must be a descendant of the node at the given absolute path.
 *
 * @remarks
 *   Jahia support: runs on the index.
 */
function descendantNode<S extends string>(
  selectorName: S,
  ancestorPath: string,
): DescendantNode<S> {
  assertName(selectorName, "A selector name", "descendantNode.selectorName");
  assertAbsolutePath(ancestorPath, "An ancestor path", "descendantNode.ancestorPath");

  return { kind: "DescendantNode", selectorName, ancestorPath };
}

/*
 * Operands.
 */

/**
 * The value of one property of one selector.
 *
 * @remarks
 *   Jahia support: runs on the index in a comparison and in an ordering.
 */
function propertyValue<S extends string>(selectorName: S, propertyName: string): PropertyValue<S> {
  assertName(selectorName, "A selector name", "propertyValue.selectorName");
  assertName(propertyName, "A property name", "propertyValue.propertyName");

  return { kind: "PropertyValue", selectorName, propertyName };
}

/**
 * The length of a property value. Named `Slow` because every comparison that holds it runs as a
 * `RowPredicate`. The specification accepts a property value only.
 *
 * @remarks
 *   Jahia support: runs in memory, with one node load per scanned hit.
 */
function lengthSlow<S extends string>(propertyValue: PropertyValue<S>): Length<S> {
  assertOperand(propertyValue, "The operand of lengthSlow()", "length.propertyValue");
  if (propertyValue.kind !== "PropertyValue") {
    throw new QueryError(
      "UNSUPPORTED",
      "lengthSlow() accepts a property value only",
      "length.propertyValue",
    );
  }

  return { kind: "Length", propertyValue };
}

/**
 * The name of the node, prefix included.
 *
 * @remarks
 *   Jahia support: runs on the index with `=` and no case transform. Every other use runs in memory,
 *   and `LIKE` with no transform fails.
 */
function nodeName<S extends string>(selectorName: S): NodeName<S> {
  assertName(selectorName, "A selector name", "nodeName.selectorName");

  return { kind: "NodeName", selectorName };
}

/**
 * The name of the node without its namespace prefix.
 *
 * @remarks
 *   Jahia support: runs on the index with `=` or `LIKE` and no case transform. Every other use runs
 *   in memory.
 */
function nodeLocalName<S extends string>(selectorName: S): NodeLocalName<S> {
  assertName(selectorName, "A selector name", "nodeLocalName.selectorName");

  return { kind: "NodeLocalName", selectorName };
}

/**
 * The full text search score of the node.
 *
 * @remarks
 *   Jahia support: native in an ordering, and in memory in a comparison.
 */
function fullTextSearchScore<S extends string>(selectorName: S): FullTextSearchScore<S> {
  assertName(selectorName, "A selector name", "fullTextSearchScore.selectorName");

  return { kind: "FullTextSearchScore", selectorName };
}

/**
 * The lower case form of an operand.
 *
 * @remarks
 *   Jahia support: over a property, runs on the index in a comparison for every operator and in
 *   memory in an ordering. Over `NAME()` or `LOCALNAME()`, runs in memory. Nested transforms
 *   collapse to the outer one.
 */
function lowerCase<S extends string = string, O extends DynamicOperand<S> = DynamicOperand<S>>(
  operand: O,
): LowerCase<S, O> {
  assertOperand(operand, "The operand of lowerCase()", "lowerCase.operand");

  return { kind: "LowerCase", operand };
}

/**
 * The upper case form of an operand.
 *
 * @remarks
 *   Jahia support: the same as `lowerCase`. In a localised session, an `UPPER` around a property that
 *   the rewriter moves to a `jnt:translation` selector makes the query fail, see `diagnose()`.
 */
function upperCase<S extends string = string, O extends DynamicOperand<S> = DynamicOperand<S>>(
  operand: O,
): UpperCase<S, O> {
  assertOperand(operand, "The operand of upperCase()", "upperCase.operand");

  return { kind: "UpperCase", operand };
}

/*
 * Orderings.
 */

/**
 * Orders ascending on a property value or on the search score, the two operands Lucene sorts
 * natively. The heap stays bounded by `offset + limit`.
 *
 * @remarks
 *   Jahia support: sorted in Lucene.
 */
function ascending<S extends string = string>(
  operand: PropertyValue<S> | FullTextSearchScore<S>,
): Ordering<S, "fast"> {
  return buildOrdering<S, "fast">(operand, Order.ASCENDING);
}

/**
 * Orders descending on a property value or on the search score.
 *
 * @remarks
 *   Jahia support: sorted in Lucene.
 */
function descending<S extends string = string>(
  operand: PropertyValue<S> | FullTextSearchScore<S>,
): Ordering<S, "fast"> {
  return buildOrdering<S, "fast">(operand, Order.DESCENDING);
}

/**
 * Orders ascending on any dynamic operand. Named `Slow` because the comparator loads a node and
 * evaluates the operand for every collected document.
 *
 * @remarks
 *   Jahia support: the heap stays bounded, but every collected document costs a node load.
 */
function ascendingSlow<S extends string = string>(operand: DynamicOperand<S>): Ordering<S, "slow"> {
  return buildOrdering<S, "slow">(operand, Order.ASCENDING);
}

/**
 * Orders descending on any dynamic operand.
 *
 * @remarks
 *   Jahia support: the heap stays bounded, but every collected document costs a node load.
 */
function descendingSlow<S extends string = string>(
  operand: DynamicOperand<S>,
): Ordering<S, "slow"> {
  return buildOrdering<S, "slow">(operand, Order.DESCENDING);
}

function buildOrdering<S extends string, P extends Speed>(
  operand: DynamicOperand<S>,
  order: Order,
): Ordering<S, P> {
  assertOperand(operand, "The operand of an ordering", "ordering.operand");

  return { kind: "Ordering", operand, order };
}

/*
 * Columns.
 */

/**
 * One `SELECT` term. With one argument it selects every property of the selector, which the
 * formatter writes as `selector.*`. With a property name it selects that property, optionally under
 * a column name.
 *
 * A column name without a property name is a compile error, because the fork factory rejects it
 * with `columnName must be null if propertyName is null`.
 *
 * The property name must be a JCR name. The Jahia extensions go in the column name, which takes a
 * looser grammar: Jahia reads `rep:facet(` off `Column.getColumnName()`, and `rep:count(` off the
 * column names of the result, so they are written as `column(sel, "count", "rep:count(...)")`.
 *
 * @remarks
 *   Jahia support: runs on the index. A `rep:facet` column, or a `rep:count` column without
 *   `approximate=1`, makes the hit loop read every document, see `diagnose()`.
 */
function column<S extends string>(selectorName: S): Column<S>;
function column<S extends string>(
  selectorName: S,
  propertyName: string,
  columnName?: string | null,
): Column<S>;
function column<S extends string>(
  selectorName: S,
  propertyName?: string,
  columnName?: string | null,
): Column<S> {
  assertName(selectorName, "A selector name", "column.selectorName");

  if (propertyName === undefined || propertyName === null) {
    if (columnName !== undefined && columnName !== null) {
      throw new QueryError(
        "INVALID_COLUMN",
        "A column name needs a property name",
        "column.columnName",
      );
    }

    return { kind: "Column", selectorName, propertyName: null, columnName: null };
  }

  assertName(propertyName, "A column property name", "column.propertyName");
  if (columnName !== undefined && columnName !== null) {
    assertColumnPart(columnName, "A column name", "column.columnName");
    return { kind: "Column", selectorName, propertyName, columnName };
  }

  return { kind: "Column", selectorName, propertyName, columnName: null };
}

/*
 * Query.
 */

/**
 * Assembles a query model.
 *
 * The cross-node checks, such as resolving a selector reference, are not run here. They need the
 * whole query, and they belong to build time: call `validateModel()` from `./validate.js`, which is
 * what the fluent facade's `build()` does.
 *
 * @remarks
 *   Jahia support: an empty column list writes `SELECT *`, and the Parser gives one wildcard column
 *   per selector over a join.
 */
function createQuery<S extends string>(
  source: Source<S>,
  constraint: Constraint<S> | null = null,
  orderings: readonly Ordering<S>[] = [],
  columns: readonly Column<S>[] = [],
): QueryModel<S> {
  assertOperand(source, "A query source", "source");

  return {
    kind: "QueryObjectModel",
    source,
    constraint,
    orderings,
    columns,
  };
}

/**
 * Widens the selector names of a constraint built outside the query, for the case where the
 * selector name lives in a `string` variable. The selector check then runs on the whole model, in
 * `validateModel()` or in the builder's `build()`.
 *
 * The speed of the constraint is kept, so one type argument is enough: `unchecked<"p">(c)` stays
 * `"fast"` for a constraint that Jackrabbit runs on the index, and becomes `"slow"` for every other
 * one, which `whereSlow()` accepts. A constraint whose speed is not known at compile time, such as
 * a value typed `Constraint<string>`, is treated as `"slow"`.
 */
export function unchecked<A extends string>(
  constraint: Constraint<string, "fast">,
): Constraint<A, "fast">;
export function unchecked<A extends string>(
  constraint: Constraint<string, Speed>,
): Constraint<A, "slow">;
export function unchecked<A extends string>(constraint: Constraint<string, Speed>): Constraint<A> {
  assertConstraint(constraint, "The operand of unchecked()", "unchecked.constraint");

  return constraint as Constraint<A>;
}

/**
 * Every method of `javax.jcr.query.qom.QueryObjectModelFactory`, as pure functions over the query
 * model. Use it directly for anything the fluent facade does not express.
 */
export const qom = {
  createQuery,
  selector,
  joinSlow,
  equiJoinCondition,
  sameNodeJoinCondition,
  childNodeJoinCondition,
  descendantNodeJoinCondition,
  and,
  or,
  not,
  comparison,
  comparisonSlow,
  propertyExistence,
  fullTextSearch,
  sameNode,
  childNode,
  descendantNode,
  propertyValue,
  lengthSlow,
  nodeName,
  nodeLocalName,
  fullTextSearchScore,
  lowerCase,
  upperCase,
  bindVariable,
  literal,
  ascending,
  descending,
  ascendingSlow,
  descendingSlow,
  column,
} as const;
