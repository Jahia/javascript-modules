import { JoinType, Operator } from "./constants.js";
import { diagnose as diagnoseModel } from "./diagnostics.js";
import type { Diagnostic, ExecutionOptions } from "./diagnostics.js";
import { qom } from "./factory.js";
import { literal } from "./literal.js";
import type { Bindings, LiteralArg } from "./literal.js";
import type {
  BindVariableValue,
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
  JoinCondition,
  Length,
  NodeLocalName,
  NodeName,
  Not,
  Ordering,
  PropertyExistence,
  PropertyValue,
  QueryModel,
  SameNode,
  SameNodeJoinCondition,
  Source,
  Speed,
  StaticOperand,
} from "./model.js";
import { QueryError, declaredSelectors, validateModel } from "./validate.js";

/**
 * The fluent facade over the factory layer. `from()` starts a chain, every chain call returns a new
 * builder, and `build()` hands back the query model the factory would have produced by hand.
 *
 * Two things are enforced by the types. A builder is executable only after `limit()` or
 * `unboundedSlow()` was called, which is what the `B` type parameter tracks. And a method without
 * the `Slow` suffix can only produce a construct that Jahia's Jackrabbit runs on the Lucene index,
 * which is what the speed marker of the model tracks.
 *
 * The limit is also enforced at run time, in `executeQuery`, because a type check does not reach a
 * JavaScript caller or an `as` cast. The speed marker is not, because a slow construct runs, and
 * only costs more.
 */

/**
 * Whether a builder carries an execution limit. Only `"limitSet"` is executable.
 *
 * The first member spells out the fix, because its name is what the compiler prints when a builder
 * without a limit reaches an execution seam.
 */
export type Bound = "call limit(n) or unboundedSlow() before executing" | "limitSet";

/** The state of a builder that has no limit yet, which is the first member of {@link Bound}. */
type NoLimit = "call limit(n) or unboundedSlow() before executing";

/** The typed selector references a callback receives, one per declared alias. */
export type Selectors<A extends string> = { readonly [K in A]: SelectorRef<K> };

/** A model node, or a callback that builds one from the declared selector references. */
export type Arg<A extends string, N> = N | ((selectors: Selectors<A>) => N);

/*
 * Selector references.
 */

/**
 * One declared alias. Its methods build the constructs that name a whole node: a path scope, a full
 * text search over every property, a wildcard column, and the three node operands.
 */
export interface SelectorRef<K extends string = string> {
  /** The alias this reference stands for. */
  readonly selectorName: K;
  /** The value of one property of this selector. */
  prop(propertyName: string): PropertyRef<K>;
  /**
   * JCR full text search over every property of the node, which is `CONTAINS(alias.*, expression)`.
   *
   * This is a search over the analysed index and not a substring match. The expression is the JCR
   * full text grammar, so it carries terms, quoted phrases, `OR`, a leading `-` for exclusion and a
   * trailing `*` for a prefix. It matches whole terms, so `fullText("graal")` matches a node whose
   * text holds the word `graal` and not one that only holds `graaljs`. Use `prop(name).like()` or
   * `prop(name).startsWith()` for a match on the characters of one property.
   */
  fullText(expression: LiteralArg): FullTextSearch<K>;
  /** Every property of this selector as one wildcard column, which is `alias.*`. */
  all(): Column<K>;
  /** The node must be a descendant of the node at this absolute path. */
  isDescendantOf(ancestorPath: string): DescendantNode<K>;
  /** The node must be a descendant of the node of another selector, which builds a join condition. */
  isDescendantOf<O extends string>(ancestor: SelectorRef<O>): DescendantNodeJoinCondition<K | O>;
  /** The node must be a child of the node at this absolute path. */
  isChildOf(parentPath: string): ChildNode<K>;
  /** The node must be a child of the node of another selector, which builds a join condition. */
  isChildOf<O extends string>(parent: SelectorRef<O>): ChildNodeJoinCondition<K | O>;
  /** The node must be the node at this absolute path. */
  isSameAs(path: string): SameNode<K>;
  /**
   * The node must be the node another selector reaches through a relative path, which builds a join
   * condition. The path defaults to `"."`, the node itself.
   */
  isSameAs<O extends string>(other: SelectorRef<O>, path?: string): SameNodeJoinCondition<K | O>;
  /** The name of the node, prefix included. */
  name(): NameRef<K>;
  /** The name of the node without its namespace prefix. */
  localName(): LocalNameRef<K>;
  /** The full text search score of the node. */
  score(): ScoreRef<K>;
}

/**
 * One property of one selector. Every comparison here runs on the index, for every operator, and so
 * do the two orderings.
 */
export interface PropertyRef<K extends string = string> {
  /** The alias this property belongs to. */
  readonly selectorName: K;
  /** The property name. */
  readonly propertyName: string;
  /** `property = value` */
  eq(value: LiteralArg): Comparison<K, "fast">;
  /** `property <> value`. Jackrabbit excludes multi-valued properties from the result. */
  ne(value: LiteralArg): Comparison<K, "fast">;
  /** `property < value` */
  lt(value: LiteralArg): Comparison<K, "fast">;
  /** `property <= value` */
  le(value: LiteralArg): Comparison<K, "fast">;
  /** `property > value` */
  gt(value: LiteralArg): Comparison<K, "fast">;
  /** `property >= value` */
  ge(value: LiteralArg): Comparison<K, "fast">;
  /** `property LIKE value`, with `%` and `_` as wildcards. */
  like(value: LiteralArg): Comparison<K, "fast">;
  /**
   * The property must equal one of these values, which folds to `=` comparisons joined with `OR`.
   * An empty list throws, because it would be a constraint that matches nothing.
   *
   * The fold writes one comparison per value, so keep the list short. Lucene bounds how many
   * clauses one boolean query may hold, and a list of hundreds of values is better expressed as a
   * path scope or as a node type than as a value list.
   */
  in(values: readonly LiteralArg[]): Constraint<K, "fast">;
  /**
   * The property must be between the two values, both ends included, which folds to `>=` and `<=`
   * joined with `AND`.
   */
  between(low: LiteralArg, high: LiteralArg): Constraint<K, "fast">;
  /**
   * The property must start with this text, which is `LIKE 'prefix%'`. The `%` and `_` characters
   * of the prefix are escaped for you, so they match themselves.
   */
  startsWith(prefix: string): Comparison<K, "fast">;
  /** Orders ascending on this property, which Lucene sorts natively. */
  asc(): Ordering<K, "fast">;
  /** Orders descending on this property, which Lucene sorts natively. */
  desc(): Ordering<K, "fast">;
  /** The node must have this property. */
  exists(): PropertyExistence<K>;
  /**
   * The node must not have this property, which is `NOT (alias.[property] IS NOT NULL)`.
   *
   * The JCR has no null value. A property is either present on the node or absent from it, so this
   * is a test of absence and never a comparison against a null. The JCR specification defines `IS
   * NOT NULL` over a property as a test of existence, so by that definition a property that holds
   * an empty string exists and this constraint does not match it, and a property whose value comes
   * from a node type default exists as well.
   */
  notExists(): Not<K, "fast">;
  /**
   * The same constraint as {@link PropertyRef.notExists}, under the name the field uses for it. The
   * JCR has no null value, so "is null" here means that the property is absent from the node.
   */
  isNull(): Not<K, "fast">;
  /**
   * JCR full text search over this property only, which is `CONTAINS(alias.[property],
   * expression)`.
   *
   * This is a search over the analysed index and not a substring match, so it matches whole terms.
   * Use {@link PropertyRef.like} or {@link PropertyRef.startsWith} for a match on the characters of
   * the value.
   */
  fullText(expression: LiteralArg): FullTextSearch<K>;
  /** Joins this property to the property of another selector on equal values. */
  equals<O extends string>(other: PropertyRef<O>): EquiJoinCondition<K | O>;
  /** Selects this property as a column, optionally under a column name. */
  as(columnName?: string): Column<K>;
  /**
   * The length of the property value. Named `Slow` because every comparison that holds it loads one
   * node per scanned hit.
   */
  lengthSlow(): LengthRef<K>;
  /** The lower case form of the property value. */
  lower(): CaseRef<K>;
  /**
   * The upper case form of the property value. It runs on the index like `lower()`, and it fails
   * for a property that the rewriter moves to a `jnt:translation` selector, which `diagnose()`
   * reports.
   */
  upper(): CaseRef<K>;
}

/**
 * A case transform over a property value. Jackrabbit serves every comparison on it from the index,
 * so the comparisons keep their plain names, while an ordering on it loads a node per collected
 * document.
 */
export interface CaseRef<K extends string = string> {
  /** `LOWER(property) = value` */
  eq(value: LiteralArg): Comparison<K, "fast">;
  /** `LOWER(property) <> value` */
  ne(value: LiteralArg): Comparison<K, "fast">;
  /** `LOWER(property) < value` */
  lt(value: LiteralArg): Comparison<K, "fast">;
  /** `LOWER(property) <= value` */
  le(value: LiteralArg): Comparison<K, "fast">;
  /** `LOWER(property) > value` */
  gt(value: LiteralArg): Comparison<K, "fast">;
  /** `LOWER(property) >= value` */
  ge(value: LiteralArg): Comparison<K, "fast">;
  /** `LOWER(property) LIKE value` */
  like(value: LiteralArg): Comparison<K, "fast">;
  /**
   * The transformed value must equal one of these values, which folds to `=` comparisons joined
   * with `OR`. An empty list throws.
   */
  in(values: readonly LiteralArg[]): Constraint<K, "fast">;
  /** The transformed value must be between the two values, both ends included. */
  between(low: LiteralArg, high: LiteralArg): Constraint<K, "fast">;
  /**
   * The transformed value must start with this text, which is `LIKE 'prefix%'`. The `%` and `_`
   * characters of the prefix are escaped for you. Write the prefix in the case the transform
   * produces, so `lower().startsWith("ho")` and not `lower().startsWith("Ho")`.
   */
  startsWith(prefix: string): Comparison<K, "fast">;
  /** Orders ascending on the transformed value, which costs one node load per collected document. */
  ascSlow(): Ordering<K, "slow">;
  /** Orders descending on the transformed value, which costs one node load per collected document. */
  descSlow(): Ordering<K, "slow">;
}

/**
 * The name of the node. The index serves `=` only, so every other method carries the `Slow` suffix.
 * `likeSlow` exists for completeness and `diagnose()` reports it as a query that fails.
 */
export interface NameRef<K extends string = string> {
  /** `NAME(alias) = value`, the one form the index serves. */
  eq(value: LiteralArg): Comparison<K, "fast">;
  /**
   * The node name must be one of these values, which folds to `=` comparisons joined with `OR`. It
   * stays on the index, because `=` is the operator the index serves for a name. An empty list
   * throws.
   */
  in(values: readonly LiteralArg[]): Constraint<K, "fast">;
  /** `NAME(alias) <> value`, evaluated in memory. */
  neSlow(value: LiteralArg): Comparison<K, "slow">;
  /** `NAME(alias) < value`, evaluated in memory. */
  ltSlow(value: LiteralArg): Comparison<K, "slow">;
  /** `NAME(alias) <= value`, evaluated in memory. */
  leSlow(value: LiteralArg): Comparison<K, "slow">;
  /** `NAME(alias) > value`, evaluated in memory. */
  gtSlow(value: LiteralArg): Comparison<K, "slow">;
  /** `NAME(alias) >= value`, evaluated in memory. */
  geSlow(value: LiteralArg): Comparison<K, "slow">;
  /** `NAME(alias) LIKE value`, which fails at execution. See `diagnose()`. */
  likeSlow(value: LiteralArg): Comparison<K, "slow">;
  /** Orders ascending on the node name, which costs one node load per collected document. */
  ascSlow(): Ordering<K, "slow">;
  /** Orders descending on the node name, which costs one node load per collected document. */
  descSlow(): Ordering<K, "slow">;
}

/** The name of the node without its prefix. The index serves `=` and `LIKE`. */
export interface LocalNameRef<K extends string = string> {
  /** `LOCALNAME(alias) = value`, served by the index. */
  eq(value: LiteralArg): Comparison<K, "fast">;
  /** `LOCALNAME(alias) LIKE value`, served by the index. */
  like(value: LiteralArg): Comparison<K, "fast">;
  /**
   * The local name must be one of these values, which folds to `=` comparisons joined with `OR`. An
   * empty list throws.
   */
  in(values: readonly LiteralArg[]): Constraint<K, "fast">;
  /**
   * The local name must start with this text, which is `LOCALNAME(alias) LIKE 'prefix%'`. The `%`
   * and `_` characters of the prefix are escaped for you.
   */
  startsWith(prefix: string): Comparison<K, "fast">;
  /** `LOCALNAME(alias) <> value`, evaluated in memory. */
  neSlow(value: LiteralArg): Comparison<K, "slow">;
  /** `LOCALNAME(alias) < value`, evaluated in memory. */
  ltSlow(value: LiteralArg): Comparison<K, "slow">;
  /** `LOCALNAME(alias) <= value`, evaluated in memory. */
  leSlow(value: LiteralArg): Comparison<K, "slow">;
  /** `LOCALNAME(alias) > value`, evaluated in memory. */
  gtSlow(value: LiteralArg): Comparison<K, "slow">;
  /** `LOCALNAME(alias) >= value`, evaluated in memory. */
  geSlow(value: LiteralArg): Comparison<K, "slow">;
  /** Orders ascending on the local name, which costs one node load per collected document. */
  ascSlow(): Ordering<K, "slow">;
  /** Orders descending on the local name, which costs one node load per collected document. */
  descSlow(): Ordering<K, "slow">;
}

/**
 * The full text search score. Lucene sorts it natively, so the two orderings keep their plain
 * names, while a comparison on it runs in memory.
 */
export interface ScoreRef<K extends string = string> {
  /** Orders ascending on the score, which Lucene sorts natively. */
  asc(): Ordering<K, "fast">;
  /** Orders descending on the score, which Lucene sorts natively. */
  desc(): Ordering<K, "fast">;
  /** `SCORE(alias) = value`, evaluated in memory. */
  eqSlow(value: LiteralArg): Comparison<K, "slow">;
  /** `SCORE(alias) <> value`, evaluated in memory. */
  neSlow(value: LiteralArg): Comparison<K, "slow">;
  /** `SCORE(alias) < value`, evaluated in memory. */
  ltSlow(value: LiteralArg): Comparison<K, "slow">;
  /** `SCORE(alias) <= value`, evaluated in memory. */
  leSlow(value: LiteralArg): Comparison<K, "slow">;
  /** `SCORE(alias) > value`, evaluated in memory. */
  gtSlow(value: LiteralArg): Comparison<K, "slow">;
  /** `SCORE(alias) >= value`, evaluated in memory. */
  geSlow(value: LiteralArg): Comparison<K, "slow">;
  /** `SCORE(alias) LIKE value`, evaluated in memory. */
  likeSlow(value: LiteralArg): Comparison<K, "slow">;
}

/** The length of a property value. Jackrabbit evaluates every use of it in memory. */
export interface LengthRef<K extends string = string> {
  /** `LENGTH(property) = value`, evaluated in memory. */
  eqSlow(value: LiteralArg): Comparison<K, "slow">;
  /** `LENGTH(property) <> value`, evaluated in memory. */
  neSlow(value: LiteralArg): Comparison<K, "slow">;
  /** `LENGTH(property) < value`, evaluated in memory. */
  ltSlow(value: LiteralArg): Comparison<K, "slow">;
  /** `LENGTH(property) <= value`, evaluated in memory. */
  leSlow(value: LiteralArg): Comparison<K, "slow">;
  /** `LENGTH(property) > value`, evaluated in memory. */
  gtSlow(value: LiteralArg): Comparison<K, "slow">;
  /** `LENGTH(property) >= value`, evaluated in memory. */
  geSlow(value: LiteralArg): Comparison<K, "slow">;
  /** `LENGTH(property) LIKE value`, evaluated in memory. */
  likeSlow(value: LiteralArg): Comparison<K, "slow">;
  /** Orders ascending on the length, which costs one node load per collected document. */
  ascSlow(): Ordering<K, "slow">;
  /** Orders descending on the length, which costs one node load per collected document. */
  descSlow(): Ordering<K, "slow">;
}

/*
 * Reference implementations.
 */

function isBindVariable(value: LiteralArg): value is BindVariableValue {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    value.kind === "BindVariableValue"
  );
}

/** Accepts a bind variable as it is, and turns every other JavaScript value into a literal. */
function staticOperand(value: LiteralArg): StaticOperand {
  return isBindVariable(value) ? value : literal(value);
}

/** The characters `LIKE` reads as wildcards, and the backslash that escapes them. */
const LIKE_SPECIAL = /[\\%_]/g;

/**
 * Turns a plain prefix into the `LIKE` pattern that matches it. The JCR-SQL2 `LIKE` operand reads
 * `%` and `_` as wildcards and a backslash as the escape character, so a prefix that holds one of
 * the three is escaped here and matches itself.
 */
function likePrefixPattern(prefix: string, at: string): string {
  if (typeof prefix !== "string") {
    throw new QueryError(
      "UNSUPPORTED",
      `startsWith() needs a string prefix, got ${String(prefix)}`,
      at,
    );
  }

  return `${prefix.replace(LIKE_SPECIAL, "\\$&")}%`;
}

/**
 * Folds a list of values into one constraint joined with `OR`, one comparison per value. An empty
 * list would be a constraint that matches nothing, which is never what the caller meant, so it
 * throws instead.
 */
function anyOf<K extends string, P extends Speed>(
  values: readonly LiteralArg[],
  comparisonFor: (value: LiteralArg) => Comparison<K, P>,
): Constraint<K, P> {
  if (!Array.isArray(values) || values.length === 0) {
    throw new QueryError("NULL_CONSTRAINT", "in() needs at least one value", "constraint");
  }

  return fold(values.map(comparisonFor), "in()", qom.or);
}

function slowComparison<K extends string>(
  operand: DynamicOperand<K>,
  operator: Operator,
  value: LiteralArg,
): Comparison<K, "slow"> {
  return qom.comparisonSlow(operand, operator, staticOperand(value));
}

function caseRef<K extends string>(operand: FastOperand<K>): CaseRef<K> {
  const fast = (operator: Operator, value: LiteralArg): Comparison<K, "fast"> =>
    qom.comparison(operand, operator, staticOperand(value));

  return {
    eq: (value) => fast(Operator.EQUAL_TO, value),
    ne: (value) => fast(Operator.NOT_EQUAL_TO, value),
    lt: (value) => fast(Operator.LESS_THAN, value),
    le: (value) => fast(Operator.LESS_THAN_OR_EQUAL_TO, value),
    gt: (value) => fast(Operator.GREATER_THAN, value),
    ge: (value) => fast(Operator.GREATER_THAN_OR_EQUAL_TO, value),
    like: (value) => fast(Operator.LIKE, value),
    in: (values) => anyOf<K, "fast">(values, (value) => fast(Operator.EQUAL_TO, value)),
    between: (low, high) =>
      qom.and(
        fast(Operator.GREATER_THAN_OR_EQUAL_TO, low),
        fast(Operator.LESS_THAN_OR_EQUAL_TO, high),
      ),
    startsWith: (prefix) => fast(Operator.LIKE, likePrefixPattern(prefix, "constraint.operand2")),
    ascSlow: () => qom.ascendingSlow(operand),
    descSlow: () => qom.descendingSlow(operand),
  };
}

function lengthRef<K extends string>(operand: Length<K>): LengthRef<K> {
  return {
    eqSlow: (value) => slowComparison(operand, Operator.EQUAL_TO, value),
    neSlow: (value) => slowComparison(operand, Operator.NOT_EQUAL_TO, value),
    ltSlow: (value) => slowComparison(operand, Operator.LESS_THAN, value),
    leSlow: (value) => slowComparison(operand, Operator.LESS_THAN_OR_EQUAL_TO, value),
    gtSlow: (value) => slowComparison(operand, Operator.GREATER_THAN, value),
    geSlow: (value) => slowComparison(operand, Operator.GREATER_THAN_OR_EQUAL_TO, value),
    likeSlow: (value) => slowComparison(operand, Operator.LIKE, value),
    ascSlow: () => qom.ascendingSlow(operand),
    descSlow: () => qom.descendingSlow(operand),
  };
}

function nameRef<K extends string>(operand: NodeName<K>): NameRef<K> {
  const equalTo = (value: LiteralArg): Comparison<K, "fast"> =>
    qom.comparison(operand, Operator.EQUAL_TO, staticOperand(value));

  return {
    eq: equalTo,
    in: (values) => anyOf<K, "fast">(values, equalTo),
    neSlow: (value) => slowComparison(operand, Operator.NOT_EQUAL_TO, value),
    ltSlow: (value) => slowComparison(operand, Operator.LESS_THAN, value),
    leSlow: (value) => slowComparison(operand, Operator.LESS_THAN_OR_EQUAL_TO, value),
    gtSlow: (value) => slowComparison(operand, Operator.GREATER_THAN, value),
    geSlow: (value) => slowComparison(operand, Operator.GREATER_THAN_OR_EQUAL_TO, value),
    likeSlow: (value) => slowComparison(operand, Operator.LIKE, value),
    ascSlow: () => qom.ascendingSlow(operand),
    descSlow: () => qom.descendingSlow(operand),
  };
}

function localNameRef<K extends string>(operand: NodeLocalName<K>): LocalNameRef<K> {
  const equalTo = (value: LiteralArg): Comparison<K, "fast"> =>
    qom.comparison(operand, Operator.EQUAL_TO, staticOperand(value));

  return {
    eq: equalTo,
    like: (value) => qom.comparison(operand, Operator.LIKE, staticOperand(value)),
    in: (values) => anyOf<K, "fast">(values, equalTo),
    startsWith: (prefix) =>
      qom.comparison(
        operand,
        Operator.LIKE,
        staticOperand(likePrefixPattern(prefix, "constraint.operand2")),
      ),
    neSlow: (value) => slowComparison(operand, Operator.NOT_EQUAL_TO, value),
    ltSlow: (value) => slowComparison(operand, Operator.LESS_THAN, value),
    leSlow: (value) => slowComparison(operand, Operator.LESS_THAN_OR_EQUAL_TO, value),
    gtSlow: (value) => slowComparison(operand, Operator.GREATER_THAN, value),
    geSlow: (value) => slowComparison(operand, Operator.GREATER_THAN_OR_EQUAL_TO, value),
    ascSlow: () => qom.ascendingSlow(operand),
    descSlow: () => qom.descendingSlow(operand),
  };
}

function scoreRef<K extends string>(operand: FullTextSearchScore<K>): ScoreRef<K> {
  return {
    asc: () => qom.ascending(operand),
    desc: () => qom.descending(operand),
    eqSlow: (value) => slowComparison(operand, Operator.EQUAL_TO, value),
    neSlow: (value) => slowComparison(operand, Operator.NOT_EQUAL_TO, value),
    ltSlow: (value) => slowComparison(operand, Operator.LESS_THAN, value),
    leSlow: (value) => slowComparison(operand, Operator.LESS_THAN_OR_EQUAL_TO, value),
    gtSlow: (value) => slowComparison(operand, Operator.GREATER_THAN, value),
    geSlow: (value) => slowComparison(operand, Operator.GREATER_THAN_OR_EQUAL_TO, value),
    likeSlow: (value) => slowComparison(operand, Operator.LIKE, value),
  };
}

function propertyRef<K extends string>(selectorName: K, propertyName: string): PropertyRef<K> {
  const operand: PropertyValue<K> = qom.propertyValue(selectorName, propertyName);
  const fast = (operator: Operator, value: LiteralArg): Comparison<K, "fast"> =>
    qom.comparison(operand, operator, staticOperand(value));

  return {
    selectorName,
    propertyName,
    eq: (value) => fast(Operator.EQUAL_TO, value),
    ne: (value) => fast(Operator.NOT_EQUAL_TO, value),
    lt: (value) => fast(Operator.LESS_THAN, value),
    le: (value) => fast(Operator.LESS_THAN_OR_EQUAL_TO, value),
    gt: (value) => fast(Operator.GREATER_THAN, value),
    ge: (value) => fast(Operator.GREATER_THAN_OR_EQUAL_TO, value),
    like: (value) => fast(Operator.LIKE, value),
    in: (values) => anyOf<K, "fast">(values, (value) => fast(Operator.EQUAL_TO, value)),
    between: (low, high) =>
      qom.and(
        fast(Operator.GREATER_THAN_OR_EQUAL_TO, low),
        fast(Operator.LESS_THAN_OR_EQUAL_TO, high),
      ),
    startsWith: (prefix) => fast(Operator.LIKE, likePrefixPattern(prefix, "constraint.operand2")),
    asc: () => qom.ascending(operand),
    desc: () => qom.descending(operand),
    exists: () => qom.propertyExistence(selectorName, propertyName),
    notExists: () => qom.not(qom.propertyExistence(selectorName, propertyName)),
    isNull: () => qom.not(qom.propertyExistence(selectorName, propertyName)),
    fullText: (expression) =>
      qom.fullTextSearch(selectorName, propertyName, staticOperand(expression)),
    equals: (other) =>
      qom.equiJoinCondition(selectorName, propertyName, other.selectorName, other.propertyName),
    as: (columnName) => qom.column(selectorName, propertyName, columnName ?? null),
    lengthSlow: () => lengthRef(qom.lengthSlow(operand)),
    lower: () => caseRef<K>(qom.lowerCase<K, PropertyValue<K>>(operand)),
    upper: () => caseRef<K>(qom.upperCase<K, PropertyValue<K>>(operand)),
  };
}

function selectorRef<K extends string>(selectorName: K): SelectorRef<K> {
  // The three path methods are overloaded: a string builds a constraint, and another selector
  // reference builds a join condition. Each implementation signature is written over `K` alone,
  // because the other side's alias `O` exists in the overloads only, so the second alias is
  // asserted to `K` here. The overloads above are what callers see and what the compiler checks.

  function isDescendantOf(ancestorPath: string): DescendantNode<K>;
  function isDescendantOf<O extends string>(
    ancestor: SelectorRef<O>,
  ): DescendantNodeJoinCondition<K | O>;
  function isDescendantOf(
    ancestor: string | SelectorRef<string>,
  ): DescendantNode<K> | DescendantNodeJoinCondition<K> {
    return typeof ancestor === "string"
      ? qom.descendantNode(selectorName, ancestor)
      : qom.descendantNodeJoinCondition<K, K>(selectorName, ancestor.selectorName as K);
  }

  function isChildOf(parentPath: string): ChildNode<K>;
  function isChildOf<O extends string>(parent: SelectorRef<O>): ChildNodeJoinCondition<K | O>;
  function isChildOf(
    parent: string | SelectorRef<string>,
  ): ChildNode<K> | ChildNodeJoinCondition<K> {
    return typeof parent === "string"
      ? qom.childNode(selectorName, parent)
      : qom.childNodeJoinCondition<K, K>(selectorName, parent.selectorName as K);
  }

  function isSameAs(path: string): SameNode<K>;
  function isSameAs<O extends string>(
    other: SelectorRef<O>,
    path?: string,
  ): SameNodeJoinCondition<K | O>;
  function isSameAs(
    other: string | SelectorRef<string>,
    path?: string,
  ): SameNode<K> | SameNodeJoinCondition<K> {
    return typeof other === "string"
      ? qom.sameNode(selectorName, other)
      : qom.sameNodeJoinCondition<K, K>(selectorName, other.selectorName as K, path);
  }

  return {
    selectorName,
    prop: (propertyName) => propertyRef(selectorName, propertyName),
    fullText: (expression) => qom.fullTextSearch(selectorName, null, staticOperand(expression)),
    all: () => qom.column(selectorName),
    isDescendantOf,
    isChildOf,
    isSameAs,
    name: () => nameRef(qom.nodeName(selectorName)),
    localName: () => localNameRef(qom.nodeLocalName(selectorName)),
    score: () => scoreRef(qom.fullTextSearchScore(selectorName)),
  };
}

/*
 * Top level helpers.
 */

/**
 * Every constraint must hold. The call is variadic and folds left into the binary `And` nodes of
 * the model. One argument returns that argument unchanged, and no argument throws.
 *
 * The speed of the result is the union of the speeds of the arguments, so one slow child makes the
 * whole constraint slow and `where()` rejects it.
 *
 * @remarks
 *   Jahia support: runs on the index when every child does.
 */
export function and<A extends string, P extends Speed>(
  ...constraints: readonly Constraint<A, P>[]
): Constraint<A, P> {
  return fold(constraints, "and()", qom.and);
}

/**
 * At least one constraint must hold. The call is variadic and folds left into the binary `Or` nodes
 * of the model.
 *
 * @remarks
 *   Jahia support: runs on the index when every child does.
 */
export function or<A extends string, P extends Speed>(
  ...constraints: readonly Constraint<A, P>[]
): Constraint<A, P> {
  return fold(constraints, "or()", qom.or);
}

/**
 * The constraint must not hold.
 *
 * @remarks
 *   Jahia support: runs on the index. A `NOT` around a property that the rewriter moves to a
 *   `jnt:translation` selector fails, which needs an internationalised property in a localised
 *   session. `diagnose()` reports the risk and the query is not refused.
 */
export function not<A extends string, P extends Speed>(constraint: Constraint<A, P>): Not<A, P> {
  return qom.not(constraint);
}

function fold<A extends string, P extends Speed>(
  constraints: readonly Constraint<A, P>[],
  what: string,
  combine: (
    constraint1: Constraint<A, P>,
    constraint2: Constraint<A, P>,
  ) => Constraint<A, P | Speed>,
): Constraint<A, P> {
  if (constraints.length === 0) {
    throw new QueryError("NULL_CONSTRAINT", `${what} needs at least one constraint`, "constraint");
  }

  return constraints.reduce((left, right) => combine(left, right) as Constraint<A, P>);
}

/*
 * The builder.
 */

/** The `on()` clause a join needs before the chain continues. A join has no `build()` without it. */
export interface JoinClause<A extends string, C extends string, B extends Bound> {
  /** The join condition, which may name the aliases of both sides. */
  on(condition: Arg<A | C, JoinCondition<A | C>>): QueryBuilder<A | C, B>;
}

/**
 * An immutable query under construction. `A` is the union of the declared aliases, and `B` says
 * whether a limit was set.
 */
export interface QueryBuilder<A extends string, B extends Bound> {
  /**
   * Phantom marker for the limit state. It exists at compile time only and the object never carries
   * it. It is named `__limit` because the compiler prints this property name next to the value of
   * `B` when a builder without a limit reaches an execution seam.
   */
  readonly __limit?: B;
  /** Adds a constraint that runs on the index. Repeated calls are joined with `AND`. */
  where(constraint: Arg<A, Constraint<A, "fast">>): QueryBuilder<A, B>;
  /** Adds a constraint of any speed. Repeated calls are joined with `AND`. */
  whereSlow(constraint: Arg<A, Constraint<A>>): QueryBuilder<A, B>;
  /**
   * Joins another node type. Named `Slow` because Jahia's engine runs both sides unbounded and
   * merges the rows in memory. The chain continues through `on()`.
   */
  joinSlow<T extends string, C extends string>(
    nodeType: T,
    alias: C,
    joinType?: JoinType,
  ): JoinClause<A, C, B>;
  /** Appends orderings that Lucene sorts natively. */
  orderBy(...orderings: Arg<A, Ordering<A, "fast">>[]): QueryBuilder<A, B>;
  /** Appends orderings of any speed. */
  orderBySlow(...orderings: Arg<A, Ordering<A>>[]): QueryBuilder<A, B>;
  /**
   * Appends columns to the statement. An empty column list writes `SELECT *`.
   *
   * This shapes the statement and nothing else. `getNodesByJCRQuery` and `useJCRQuery` return the
   * nodes of the left selector whatever the columns say, so a named column is not a field of the
   * result. Read the value from the node that comes back.
   */
  select(...columns: Arg<A, Column<A>>[]): QueryBuilder<A, B>;
  /** Sets the execution limit, which is what makes the builder executable. */
  limit(count: number): QueryBuilder<A, "limitSet">;
  /**
   * Runs without a limit. Named `Slow` because the search then walks every hit. It stores `-1`,
   * which is the value the JCR `setLimit` contract reads as unbounded. `diagnose()` reports it as a
   * `full-scan` finding.
   */
  unboundedSlow(): QueryBuilder<A, "limitSet">;
  /** Sets the execution offset. It never enters the model. */
  offset(count: number): QueryBuilder<A, B>;
  /** Binds values for the bind variables of the model. Repeated calls merge. */
  bind(values: Bindings): QueryBuilder<A, B>;
  /**
   * Runs the cross-node checks and returns the model. With `strict`, it also throws on a diagnostic
   * whose level is `none`, which is a query that fails at execution. A `none` finding marked
   * `conditional` is left through, because it needs a condition the model cannot see.
   */
  build(options?: { strict?: boolean }): QueryModel<A>;
  /** Reports how Jahia's Jackrabbit runs this query, model and execution options together. */
  diagnose(): Diagnostic[];
  /**
   * The model as it stands. It never carries the limit, the offset or the bindings.
   *
   * @internal This is the shape the sink walks, not a supported surface, and it can change in a
   *   patch release. Call `build()` for the model a caller may keep. The member stays in the
   *   published declarations, because `stripInternal` would take the phantom limit marker with it
   *   and `Executable` is built on that marker.
   */
  readonly model: QueryModel<A>;
  /**
   * The values that travel next to the model.
   *
   * @internal Same reservation as {@link QueryBuilder.model}: it is the shape the execution seams
   *   read, and it can change in a patch release.
   */
  readonly execution: ExecutionOptions;
}

/** A builder that may be executed, which is one whose limit was set. */
export type Executable<A extends string = string> = QueryBuilder<A, "limitSet">;

/** What the execution seams accept: a JCR-SQL2 statement, or a builder that carries its limit. */
export type Queryable = string | Executable;

function resolveArg<A extends string, N>(arg: Arg<A, N>, selectors: Selectors<A>): N {
  return typeof arg === "function" ? (arg as (s: Selectors<A>) => N)(selectors) : arg;
}

function selectorsFor<A extends string>(aliases: readonly string[]): Selectors<A> {
  const selectors: Record<string, SelectorRef<string>> = {};
  for (const alias of aliases) {
    selectors[alias] = selectorRef(alias);
  }

  // The map is built from the aliases the source declares, which is exactly the union `A`. The
  // compiler cannot see that, so the shape is asserted once here.
  return selectors as unknown as Selectors<A>;
}

function assertCount(count: number, what: string, at: string): void {
  if (typeof count !== "number" || !Number.isInteger(count) || count < 0) {
    throw new QueryError(
      "UNSUPPORTED",
      `${what} needs an integer of zero or more, got ${String(count)}`,
      at,
    );
  }
}

class Chain<A extends string, B extends Bound> implements QueryBuilder<A, B> {
  declare readonly __limit?: B;

  readonly model: QueryModel<A>;
  readonly execution: ExecutionOptions;

  private readonly selectors: Selectors<A>;

  constructor(
    source: Source<A>,
    constraint: Constraint<A> | null,
    orderings: readonly Ordering<A>[],
    columns: readonly Column<A>[],
    execution: ExecutionOptions,
  ) {
    this.model = qom.createQuery(source, constraint, orderings, columns);
    this.execution = execution;
    this.selectors = selectorsFor<A>(declaredSelectors(source));
  }

  private next<B2 extends Bound>(
    constraint: Constraint<A> | null,
    orderings: readonly Ordering<A>[],
    columns: readonly Column<A>[],
    execution: ExecutionOptions,
  ): Chain<A, B2> {
    return new Chain<A, B2>(this.model.source, constraint, orderings, columns, execution);
  }

  private added(constraint: Constraint<A>): Constraint<A> {
    const current = this.model.constraint;
    return current === null ? constraint : qom.and(current, constraint);
  }

  where(constraint: Arg<A, Constraint<A, "fast">>): QueryBuilder<A, B> {
    return this.whereSlow(constraint);
  }

  whereSlow(constraint: Arg<A, Constraint<A>>): QueryBuilder<A, B> {
    const resolved = resolveArg(constraint, this.selectors);
    return this.next<B>(this.added(resolved), this.model.orderings, this.model.columns, {
      ...this.execution,
    });
  }

  joinSlow<T extends string, C extends string>(
    nodeType: T,
    alias: C,
    joinType: JoinType = JoinType.INNER,
  ): JoinClause<A, C, B> {
    const right = qom.selector(nodeType, alias);
    const selectors = selectorsFor<A | C>([...declaredSelectors(this.model.source), alias]);

    return {
      on: (condition: Arg<A | C, JoinCondition<A | C>>): QueryBuilder<A | C, B> => {
        const source = qom.joinSlow<A, C>(
          this.model.source,
          right,
          joinType,
          resolveArg(condition, selectors),
        );

        return new Chain<A | C, B>(
          source,
          this.model.constraint,
          this.model.orderings,
          this.model.columns,
          { ...this.execution },
        );
      },
    };
  }

  orderBy(...orderings: Arg<A, Ordering<A, "fast">>[]): QueryBuilder<A, B> {
    return this.orderBySlow(...orderings);
  }

  orderBySlow(...orderings: Arg<A, Ordering<A>>[]): QueryBuilder<A, B> {
    const resolved = orderings.map((ordering) => resolveArg(ordering, this.selectors));
    return this.next<B>(
      this.model.constraint,
      [...this.model.orderings, ...resolved],
      this.model.columns,
      { ...this.execution },
    );
  }

  select(...columns: Arg<A, Column<A>>[]): QueryBuilder<A, B> {
    const resolved = columns.map((column) => resolveArg(column, this.selectors));
    return this.next<B>(
      this.model.constraint,
      this.model.orderings,
      [...this.model.columns, ...resolved],
      { ...this.execution },
    );
  }

  limit(count: number): QueryBuilder<A, "limitSet"> {
    assertCount(count, "limit()", "execution.limit");
    return this.withExecution<"limitSet">({ limit: count });
  }

  unboundedSlow(): QueryBuilder<A, "limitSet"> {
    return this.withExecution<"limitSet">({ limit: -1 });
  }

  offset(count: number): QueryBuilder<A, B> {
    assertCount(count, "offset()", "execution.offset");
    return this.withExecution<B>({ offset: count });
  }

  bind(values: Bindings): QueryBuilder<A, B> {
    if (!values || typeof values !== "object") {
      throw new QueryError(
        "UNSUPPORTED",
        `bind() needs an object of values, got ${String(values)}`,
        "execution.bindings",
      );
    }

    return this.withExecution<B>({ bindings: { ...this.execution.bindings, ...values } });
  }

  private withExecution<B2 extends Bound>(patch: ExecutionOptions): QueryBuilder<A, B2> {
    return this.next<B2>(this.model.constraint, this.model.orderings, this.model.columns, {
      ...this.execution,
      ...patch,
    });
  }

  build(options: { strict?: boolean } = {}): QueryModel<A> {
    validateModel(this.model);

    if (options.strict) {
      // A `conditional` finding needs a condition the model cannot see, so the query runs in every
      // other condition. Refusing it here would take a whole construct away from every caller, see
      // the `none` list of section 6.6 of the plan.
      const blocking = this.diagnose().filter(
        (finding) => finding.level === "none" && !finding.conditional,
      );
      if (blocking.length > 0) {
        throw new QueryError(
          "UNSUPPORTED",
          `This query does not run on Jahia: ${blocking[0].reason}`,
          blocking[0].at,
        );
      }
    }

    return this.model;
  }

  diagnose(): Diagnostic[] {
    return diagnoseModel(this.model, this.execution);
  }
}

/**
 * Starts a query over one node type, under a required alias, or lifts a model the factory built.
 *
 * Every chain call returns a new builder, so one base serves several pages, and the builder is
 * never thenable: nothing runs until an execution seam receives it. The alias is required, so a
 * callback destructures it by name. The alias-less `SELECT * FROM [jnt:page]` form stays reachable
 * through `qom.selector("jnt:page")` and the second signature below.
 *
 * @remarks
 *   Jahia support: a query without a limit cannot be executed. `Queryable` accepts a builder whose
 *   limit was set only, and the execution seams throw `UNSUPPORTED` on a builder that reaches them
 *   without one. The escape hatch is `unboundedSlow()`.
 * @example
 *   ```ts
 *   from("jnt:page", "p")
 *     .where(({ p }) => p.prop("jcr:title").eq("Home"))
 *     .limit(20);
 *   ```;
 *
 * @experimental The facade is experimental for one minor version.
 */
export function from<T extends string, A extends string>(
  nodeType: T,
  alias: A,
): QueryBuilder<A, NoLimit>;
export function from<S extends string>(model: QueryModel<S>): QueryBuilder<S, NoLimit>;
export function from(
  nodeTypeOrModel: string | QueryModel,
  alias?: string,
): QueryBuilder<string, NoLimit> {
  if (typeof nodeTypeOrModel !== "string") {
    const model = nodeTypeOrModel;
    return new Chain<string, NoLimit>(
      model.source,
      model.constraint,
      model.orderings,
      model.columns,
      {},
    );
  }

  if (typeof alias !== "string") {
    throw new QueryError(
      "INVALID_NAME",
      `from() needs a selector alias, got ${String(alias)}. Use qom.selector() for the alias-less form`,
      "source.selectorName",
    );
  }

  return new Chain<string, NoLimit>(qom.selector(nodeTypeOrModel, alias), null, [], [], {});
}
