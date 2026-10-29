import type { JoinType, LiteralType, Operator, Order } from "./constants.js";

/**
 * The query model is a set of plain, immutable and JSON serialisable objects. One type exists per
 * interface of `javax.jcr.query.qom`, and the `kind` field holds the simple name of that
 * interface.
 *
 * Two type parameters are phantom, which means that they exist at compile time only and that the
 * JSON form does not carry them:
 *
 * - `S` is the union of the selector names a node may reference. A node built for one selector is not
 *   assignable where another selector is expected.
 * - `P` is the speed of a node, `"fast"` when Jackrabbit runs the construct on the Lucene index and
 *   `"slow"` when it runs it in memory. It marks `Source`, `Constraint` and `Ordering`.
 */

/** Speed of a construct: `"fast"` runs on the Lucene index, `"slow"` runs in memory. */
export type Speed = "fast" | "slow";

/*
 * Sources.
 */

/** A node type and the name under which the query refers to it. */
export interface Selector<S extends string = string> {
  readonly kind: "Selector";
  readonly nodeTypeName: string;
  readonly selectorName: S;
}

/**
 * Two sources and the condition that joins them. Every join is `"slow"`, because Jackrabbit runs
 * both sides unbounded and merges the rows in memory.
 */
export interface Join<S extends string = string, P extends Speed = Speed> {
  readonly kind: "Join";
  readonly left: Source<S>;
  readonly right: Source<S>;
  readonly joinType: JoinType;
  readonly joinCondition: JoinCondition<S>;
  /** Phantom marker, never written to the object. */
  readonly speed?: P;
}

/** A selector, or a join of two sources. */
export type Source<S extends string = string, P extends Speed = Speed> = Selector<S> | Join<S, P>;

/*
 * Join conditions.
 */

/** Joins two selectors on the value of one property each. */
export interface EquiJoinCondition<S extends string = string> {
  readonly kind: "EquiJoinCondition";
  readonly selector1Name: S;
  readonly property1Name: string;
  readonly selector2Name: S;
  readonly property2Name: string;
}

/**
 * Joins two selectors on node identity. `selector2Path` is a relative path from the node of
 * `selector1Name`, and it defaults to `"."`, which the Parser also writes.
 */
export interface SameNodeJoinCondition<S extends string = string> {
  readonly kind: "SameNodeJoinCondition";
  readonly selector1Name: S;
  readonly selector2Name: S;
  readonly selector2Path: string;
}

/** Joins a child selector to its parent selector. */
export interface ChildNodeJoinCondition<S extends string = string> {
  readonly kind: "ChildNodeJoinCondition";
  readonly childSelectorName: S;
  readonly parentSelectorName: S;
}

/** Joins a descendant selector to one of its ancestor selectors. */
export interface DescendantNodeJoinCondition<S extends string = string> {
  readonly kind: "DescendantNodeJoinCondition";
  readonly descendantSelectorName: S;
  readonly ancestorSelectorName: S;
}

/** Any of the four join conditions of the specification. */
export type JoinCondition<S extends string = string> =
  | EquiJoinCondition<S>
  | SameNodeJoinCondition<S>
  | ChildNodeJoinCondition<S>
  | DescendantNodeJoinCondition<S>;

/*
 * Constraints.
 */

/** Both constraints must hold. */
export interface And<S extends string = string, P extends Speed = Speed> {
  readonly kind: "And";
  readonly constraint1: Constraint<S>;
  readonly constraint2: Constraint<S>;
  /** Phantom marker, never written to the object. */
  readonly speed?: P;
}

/** At least one of the two constraints must hold. */
export interface Or<S extends string = string, P extends Speed = Speed> {
  readonly kind: "Or";
  readonly constraint1: Constraint<S>;
  readonly constraint2: Constraint<S>;
  /** Phantom marker, never written to the object. */
  readonly speed?: P;
}

/** The constraint must not hold. */
export interface Not<S extends string = string, P extends Speed = Speed> {
  readonly kind: "Not";
  readonly constraint: Constraint<S>;
  /** Phantom marker, never written to the object. */
  readonly speed?: P;
}

/** Compares a dynamic operand with a static operand. */
export interface Comparison<S extends string = string, P extends Speed = Speed> {
  readonly kind: "Comparison";
  readonly operand1: DynamicOperand<S>;
  readonly operator: Operator;
  readonly operand2: StaticOperand;
  /** Phantom marker, never written to the object. */
  readonly speed?: P;
}

/** The node must have the property. */
export interface PropertyExistence<S extends string = string> {
  readonly kind: "PropertyExistence";
  readonly selectorName: S;
  readonly propertyName: string;
}

/**
 * Full text search over one property, or over every property of the node when `propertyName` is
 * `null`. The `null` changes the statement, so the field stays explicit.
 */
export interface FullTextSearch<S extends string = string> {
  readonly kind: "FullTextSearch";
  readonly selectorName: S;
  readonly propertyName: string | null;
  readonly fullTextSearchExpression: StaticOperand;
}

/** The node must be the node at the given absolute path. */
export interface SameNode<S extends string = string> {
  readonly kind: "SameNode";
  readonly selectorName: S;
  readonly path: string;
}

/** The node must be a child of the node at the given absolute path. */
export interface ChildNode<S extends string = string> {
  readonly kind: "ChildNode";
  readonly selectorName: S;
  readonly parentPath: string;
}

/** The node must be a descendant of the node at the given absolute path. */
export interface DescendantNode<S extends string = string> {
  readonly kind: "DescendantNode";
  readonly selectorName: S;
  readonly ancestorPath: string;
}

/** Any of the nine constraints of the specification. */
export type Constraint<S extends string = string, P extends Speed = Speed> =
  | And<S, P>
  | Or<S, P>
  | Not<S, P>
  | Comparison<S, P>
  | PropertyExistence<S>
  | FullTextSearch<S>
  | SameNode<S>
  | ChildNode<S>
  | DescendantNode<S>;

/*
 * Operands.
 */

/** A typed value, rendered by the formatter as a bare boolean, a quoted string or a `CAST`. */
export interface Literal {
  readonly kind: "Literal";
  readonly type: LiteralType;
  readonly value: string;
}

/** A named placeholder for a value supplied at execution time. */
export interface BindVariableValue {
  readonly kind: "BindVariableValue";
  readonly bindVariableName: string;
}

/** An operand whose value does not depend on the node. */
export type StaticOperand = Literal | BindVariableValue;

/** The value of one property of one selector. */
export interface PropertyValue<S extends string = string> {
  readonly kind: "PropertyValue";
  readonly selectorName: S;
  readonly propertyName: string;
}

/**
 * The length of a property value. The specification accepts a `PropertyValue` only, see
 * `javax.jcr.query.qom.Length`, so the field is narrowed to that type.
 */
export interface Length<S extends string = string> {
  readonly kind: "Length";
  readonly propertyValue: PropertyValue<S>;
}

/** The name of the node, prefix included. */
export interface NodeName<S extends string = string> {
  readonly kind: "NodeName";
  readonly selectorName: S;
}

/** The name of the node without its namespace prefix. */
export interface NodeLocalName<S extends string = string> {
  readonly kind: "NodeLocalName";
  readonly selectorName: S;
}

/** The full text search score of the node. */
export interface FullTextSearchScore<S extends string = string> {
  readonly kind: "FullTextSearchScore";
  readonly selectorName: S;
}

/**
 * The lower case form of an operand. The operand type is carried, so the fast comparison overload
 * can require a `PropertyValue` at the innermost position.
 */
export interface LowerCase<
  S extends string = string,
  O extends DynamicOperand<S> = DynamicOperand<S>,
> {
  readonly kind: "LowerCase";
  readonly operand: O;
}

/** The upper case form of an operand, with the same operand typing as `LowerCase`. */
export interface UpperCase<
  S extends string = string,
  O extends DynamicOperand<S> = DynamicOperand<S>,
> {
  readonly kind: "UpperCase";
  readonly operand: O;
}

/** Any of the seven operands whose value depends on the node. */
export type DynamicOperand<S extends string = string> =
  | PropertyValue<S>
  | Length<S>
  | NodeName<S>
  | NodeLocalName<S>
  | FullTextSearchScore<S>
  | LowerCase<S, DynamicOperand<S>>
  | UpperCase<S, DynamicOperand<S>>;

/**
 * The common supertype of the two operand families, per `javax.jcr.query.qom.Operand`. The spec
 * interface carries no member, and no factory method takes it, so nothing narrows to it. It exists
 * so that the model holds one type per spec interface.
 */
export type Operand<S extends string = string> = StaticOperand | DynamicOperand<S>;

/**
 * An operand that Jackrabbit compares on the index for every operator: a property value, or a case
 * transform over a property value.
 */
export type FastOperand<S extends string = string> =
  PropertyValue<S> | LowerCase<S, FastOperand<S>> | UpperCase<S, FastOperand<S>>;

/*
 * Orderings and columns.
 */

/** One `ORDER BY` term. */
export interface Ordering<S extends string = string, P extends Speed = Speed> {
  readonly kind: "Ordering";
  readonly operand: DynamicOperand<S>;
  readonly order: Order;
  /** Phantom marker, never written to the object. */
  readonly speed?: P;
}

/**
 * One `SELECT` term. The factory of the fork rejects `column(selector, null, "alias")` with
 * `columnName must be null if propertyName is null`, so the type is a union: either both fields are
 * `null`, which selects every property of the selector, or `propertyName` is set.
 */
export type Column<S extends string = string> =
  | {
      readonly kind: "Column";
      readonly selectorName: S;
      readonly propertyName: null;
      readonly columnName: null;
    }
  | {
      readonly kind: "Column";
      readonly selectorName: S;
      readonly propertyName: string;
      readonly columnName: string | null;
    };

/** A complete query: a source, an optional constraint, orderings and columns. */
export interface QueryModel<S extends string = string> {
  readonly kind: "QueryObjectModel";
  readonly source: Source<S>;
  readonly constraint: Constraint<S> | null;
  readonly orderings: readonly Ordering<S>[];
  readonly columns: readonly Column<S>[];
}
