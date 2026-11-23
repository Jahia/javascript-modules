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

/**
 * Which selector references a callback receives. A query started without an alias hands the
 * callback the one reference, and a query that declares aliases hands it the record.
 */
export type RefShape = "unaliased" | "aliased";

/** The typed selector references a callback receives, one per declared alias. */
export type Selectors<A extends string> = { readonly [K in A]: SelectorRef<K> };

/** What a callback receives: the one reference of a query that declared no alias, or the record. */
export type Refs<A extends string, S extends RefShape> = S extends "unaliased"
  ? SelectorRef<A>
  : Selectors<A>;

/** A model node, or a callback that builds one from the selector references. */
export type Arg<A extends string, S extends RefShape, N> = N | ((refs: Refs<A, S>) => N);

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
   * text holds the word `graal` and not one that only holds `graaljs`. Use `prop(name).contains()`
   * for a substring match on the characters of one property.
   *
   * This is the operator that Jahia's GraphQL `nodesByCriteria` API calls `contains`. The index
   * lowercases, folds accents and stems, so `fullText("chateaux")` finds a title of `Châteaux`,
   * while a term that carries a wildcard skips the analyser and is neither folded nor stemmed. The
   * default operator between two terms is `AND`, so `fullText("chateaux zzzznomatch")` matches
   * nothing. The wildcard is `*` and never `%`: a `%` is an ordinary character and the analyser
   * splits the term at it, so `fullText("%term%")` searches for `term` itself while
   * `fullText("ho%me")` searches for `ho` and `me` together, and a `%` next to a `*` survives into
   * the term and the expression then matches nothing.
   *
   * The expression reaches Jahia as it was written. An expression the parser rejects, such as
   * `privacy!`, `foo(`, an unclosed quotation mark, a bare `OR` or `--`, fails the whole query at
   * execution with a `RepositoryException` and takes down every clause beside it. `diagnose()`
   * reads a literal expression and reports four shapes at level `none`, so `build({ strict: true
   * })` and `executeQuery` refuse the query before the first call into Jahia: no term left once the
   * operators are removed, an odd number of quotation marks, a parenthesis that does not pair up
   * outside a quoted phrase, and an operator missing the term it needs, which is a trailing `-`,
   * `+`, `!` or `OR`, or a leading `OR`, `&&` or `||`. A `%` is reported at level `partial`.
   * Nothing here rewrites what the caller wrote, so sanitise text that a visitor typed before you
   * build the clause.
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
  /**
   * `property LIKE pattern`, the one pattern match the JCR defines, served by the index.
   *
   * The pattern is a glob over the whole stored value and never a regular expression. `%` matches
   * zero or more characters, `_` matches exactly one, and a backslash makes the next character
   * literal. A wildcard may sit anywhere, the leading position included. The comparison is case
   * sensitive, and it reads the value whole rather than term by term, so `like("off")` does not
   * match `50% off` while `like("%off")` does. On a multi-valued property the node matches when any
   * one of its values matches.
   *
   * Escape `%`, `_` and the backslash itself, and nothing else. Jackrabbit keeps the backslash in
   * front of a letter or a digit instead of dropping it, against section 6.7.16 of the JCR
   * specification, so a pattern that escapes a letter matches nothing, and a pattern that ends in a
   * lone backslash loses it. {@link PropertyRef.startsWith}, {@link PropertyRef.endsWith} and
   * {@link PropertyRef.contains} do that escaping for you and never emit the broken form.
   */
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
   * The property must start with this text, which is `LIKE 'text%'`, served by the index.
   *
   * The `%`, the `_` and the backslash of the text are escaped for you, so each matches itself:
   * `startsWith("50% off")` matches a value that really starts with `50% off`. The comparison is
   * case sensitive, so use `lower().startsWith()` to ignore case.
   */
  startsWith(text: string): Comparison<K, "fast">;
  /**
   * The property must end with this text, which is `LIKE '%text'`, served by the index.
   *
   * It escapes the text the way {@link PropertyRef.startsWith} does. The leading wildcard is served
   * by the index too: the term scan stays inside this one property, so the cost follows the number
   * of matches and not the size of the repository, and the name carries no `Slow` suffix.
   */
  endsWith(text: string): Comparison<K, "fast">;
  /**
   * The property must hold this text somewhere, which is `LIKE '%text%'`, served by the index.
   *
   * It escapes the text the way {@link PropertyRef.startsWith} does, and it costs what
   * {@link PropertyRef.endsWith} costs.
   *
   * An empty text builds the pattern `%%`, which matches every node that carries the property, so
   * skip the clause when the search box is empty rather than passing an empty string.
   *
   * This is a substring match over the characters of the stored value, which is what `contains`
   * means in Prisma and in Drizzle. It builds a `LIKE` pattern and not the JCR-SQL2 `CONTAINS()`
   * function, which is what {@link PropertyRef.fullText} builds. Full text searches the analysed
   * index: it matches stemmed terms and ignores case, so it finds `500 seats` for the term `seat`,
   * while `contains("seat")` finds that value only because the characters are there and
   * `contains("Seat")` finds nothing.
   *
   * Jahia's GraphQL `nodesByCriteria` API uses the two words the other way round: its `contains` is
   * the full text search and its `like` is this raw pattern match. A reader who arrives from that
   * API and expects the analysed search gets raw characters instead, with no accent folding and no
   * stemming, so `contains("chateaux")` does not find a title of `Châteaux`. Call
   * {@link PropertyRef.fullText} for the operator that API names `contains`.
   */
  contains(text: string): Comparison<K, "fast">;
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
   * from a node type default exists as well. Jahia was measured to behave that way: a property set
   * to the empty string answers `exists()` and is not returned by this constraint.
   */
  notExists(): Not<K, "fast">;
  /**
   * JCR full text search over this property only, which is `CONTAINS(alias.[property],
   * expression)`.
   *
   * This is a search over the analysed index and not a substring match, so it matches whole terms.
   * Use {@link PropertyRef.contains} for a match on the characters of the value. It carries the same
   * expression rules as {@link SelectorRef.fullText}, and it is the operator that Jahia's GraphQL
   * `nodesByCriteria` API calls `contains`.
   *
   * Scope changes what a full text search reads. A property declared `nofulltext`, such as
   * `j:tagList`, is left out of the aggregated node text and keeps its own full text field, so this
   * form finds nodes that {@link SelectorRef.fullText} does not. The node name is the opposite case:
   * it reaches the aggregated text and does not answer `prop("j:nodename").fullText()`.
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
 *
 * The transform applies to the property and never to the value the caller passes. `LOWER(property)`
 * can hold no uppercase letter, so `lower().eq("Home")`, `lower().like("%Home%")` and
 * `lower().contains("Home")` could only ever match nothing, and Jahia would report that as an empty
 * result and not as an error. Write every value in the case the transform produces.
 *
 * The seven methods whose result turns on the exact value refuse a string value in another case and
 * throw a `QueryError` whose code is `NULL_CONSTRAINT`, naming the value to write instead, the way
 * `in([])` refuses a list that would match nothing: `eq`, `ne`, `in`, `like`, `startsWith`,
 * `endsWith` and `contains`. The bounds `lt`, `le`, `gt`, `ge` and `between` take any case, because
 * a bound is not a match. A bind variable carries no value at the call and is never checked.
 */
export interface CaseRef<K extends string = string> {
  /** `LOWER(property) = value` */
  eq(value: LiteralArg): Comparison<K, "fast">;
  /**
   * `LOWER(property) <> value`. A value in another case excludes nothing, so the comparison would
   * return every node that carries the property, and the call throws instead.
   */
  ne(value: LiteralArg): Comparison<K, "fast">;
  /** `LOWER(property) < value` */
  lt(value: LiteralArg): Comparison<K, "fast">;
  /** `LOWER(property) <= value` */
  le(value: LiteralArg): Comparison<K, "fast">;
  /** `LOWER(property) > value` */
  gt(value: LiteralArg): Comparison<K, "fast">;
  /** `LOWER(property) >= value` */
  ge(value: LiteralArg): Comparison<K, "fast">;
  /**
   * `LOWER(property) LIKE pattern`, the same pattern language as {@link PropertyRef.like}. The
   * backslash escape survives the transform, so a pattern built for the untransformed property
   * keeps its meaning here.
   */
  like(value: LiteralArg): Comparison<K, "fast">;
  /**
   * The transformed value must equal one of these values, which folds to `=` comparisons joined
   * with `OR`. An empty list throws.
   */
  in(values: readonly LiteralArg[]): Constraint<K, "fast">;
  /** The transformed value must be between the two values, both ends included. */
  between(low: LiteralArg, high: LiteralArg): Constraint<K, "fast">;
  /**
   * The transformed value must start with this text, which is `LIKE 'text%'`. The `%`, the `_` and
   * the backslash of the text are escaped for you. Write the text in the case the transform
   * produces: `lower().startsWith("ho")` builds the pattern, and `lower().startsWith("Ho")`
   * throws.
   */
  startsWith(text: string): Comparison<K, "fast">;
  /**
   * The transformed value must end with this text, which is `LIKE '%text'`, with the same escaping
   * and the same case rule as {@link CaseRef.startsWith}.
   */
  endsWith(text: string): Comparison<K, "fast">;
  /**
   * The transformed value must hold this text somewhere, which is `LIKE '%text%'`, with the same
   * escaping and the same case rule as {@link CaseRef.startsWith}. This is the case insensitive
   * substring match: `lower().contains("meetup")` finds a value of `MeetUp`.
   */
  contains(text: string): Comparison<K, "fast">;
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
  /**
   * `NAME(alias) LIKE value`, which fails at execution with an
   * `UnsupportedRepositoryOperationException`, as `diagnose()` reports. This reference therefore
   * carries no `startsWith`, `endsWith` or `contains`. Use `localName()` for a pattern match on a
   * node name, or wrap the name in `LOWER` through the factory, which moves the comparison into
   * memory where `LIKE` is supported.
   */
  likeSlow(value: LiteralArg): Comparison<K, "slow">;
  /** Orders ascending on the node name, which costs one node load per collected document. */
  ascSlow(): Ordering<K, "slow">;
  /** Orders descending on the node name, which costs one node load per collected document. */
  descSlow(): Ordering<K, "slow">;
}

/**
 * The name of the node without its prefix. The index serves `=` and `LIKE`, so the pattern methods
 * keep their plain names. A pattern that opens with a wildcard is served by the index as well. Its
 * term walk is wider here than on a property, because the index prefixes a property's terms with
 * the property name and a local name carries no such prefix, but the cost still follows the number
 * of matches rather than the width of the walk.
 */
export interface LocalNameRef<K extends string = string> {
  /** `LOCALNAME(alias) = value`, served by the index. */
  eq(value: LiteralArg): Comparison<K, "fast">;
  /**
   * `LOCALNAME(alias) LIKE pattern`, served by the index, with the same pattern language as
   * {@link PropertyRef.like}.
   */
  like(value: LiteralArg): Comparison<K, "fast">;
  /**
   * The local name must be one of these values, which folds to `=` comparisons joined with `OR`. An
   * empty list throws.
   */
  in(values: readonly LiteralArg[]): Constraint<K, "fast">;
  /**
   * The local name must start with this text, which is `LOCALNAME(alias) LIKE 'text%'`. The `%`,
   * the `_` and the backslash of the text are escaped for you.
   */
  startsWith(text: string): Comparison<K, "fast">;
  /**
   * The local name must end with this text, which is `LOCALNAME(alias) LIKE '%text'`, with the same
   * escaping as {@link LocalNameRef.startsWith}.
   */
  endsWith(text: string): Comparison<K, "fast">;
  /**
   * The local name must hold this text somewhere, which is `LOCALNAME(alias) LIKE '%text%'`, with
   * the same escaping as {@link LocalNameRef.startsWith}.
   */
  contains(text: string): Comparison<K, "fast">;
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
  /**
   * `LENGTH(property) LIKE value`, evaluated in memory. It carries no pattern: the engine casts the
   * operand of a `LENGTH` comparison to `LONG` before it compares, so a pattern that holds a
   * wildcard fails with a `ValueFormatException` and a pattern of digits alone means `eqSlow`.
   */
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

/** Where the literal text sits inside the pattern each of the three methods builds. */
const LIKE_AFFIXES = {
  startsWith: ["", "%"],
  endsWith: ["%", ""],
  contains: ["%", "%"],
} as const;

/** The three methods that take literal text and build the `LIKE` pattern that matches it. */
type LikeMethod = keyof typeof LIKE_AFFIXES;

/**
 * Turns literal text into the `LIKE` pattern that matches it, with a wildcard on the side the
 * method names.
 *
 * `LIKE` reads `%` and `_` as wildcards and a backslash as the escape character, so each of the
 * three is escaped here and matches itself. Those three are the only characters escaped, because
 * they are the only ones Jackrabbit unescapes faithfully: a backslash in front of a letter or a
 * digit reaches the matcher as a backslash instead of disappearing, so escaping more would build a
 * pattern that matches nothing.
 */
function likePattern(text: string, method: LikeMethod): string {
  if (typeof text !== "string") {
    throw new QueryError(
      "UNSUPPORTED",
      `${method}() needs a string, got ${String(text)}`,
      "constraint.operand2",
    );
  }

  const [before, after] = LIKE_AFFIXES[method];
  return `${before}${text.replace(LIKE_SPECIAL, "\\$&")}${after}`;
}

/**
 * Folds a list of values into one constraint joined with `OR`, one comparison per value. An empty
 * list would be a constraint that matches nothing, which is never what the caller meant, so it
 * throws instead.
 */
function anyOf<K extends string, P extends Speed>(
  values: readonly LiteralArg[],
  comparisonFor: (value: LiteralArg, index: number) => Comparison<K, P>,
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

/** The text a case transform compares against, when the argument carries one to read. */
function caseSensitiveText(value: LiteralArg): string | null {
  if (typeof value === "string") {
    return value;
  }

  // A bind variable holds no value here. A literal of another type is a name, a path or a URI,
  // where the case belongs to the identifier and not to a spelling the caller chose.
  if (typeof value === "object" && value !== null && "kind" in value) {
    return value.kind === "Literal" && value.type === "String" ? value.value : null;
  }

  return null;
}

/**
 * A case transform over a property, with the guard that refuses a value the transform can never
 * produce.
 *
 * `LOWER(property)` holds no uppercase letter, so `lower().eq("Home")` compares a lowercased value
 * against one that still carries a capital and matches nothing, under every operator whose match is
 * an equality or a pattern. Nothing downstream can report that: the comparison is well formed, the
 * statement is valid, and Jahia returns an empty result. Both sides are in hand at the call, so the
 * call throws, the way `in([])` already throws for a constraint that would match nothing.
 *
 * `ne` is guarded for the same reason read from the other side. `lower().ne("Home")` builds
 * `LOWER(property) <> 'Home'`, which no lowercased value can equal, so it excludes nothing and
 * returns every node that carries the property. A dead exclusion is as silent as a dead match.
 *
 * The bounds are left alone. `lower().lt("M")` is an ordinary bound over the transformed value and
 * not a match, so the same reasoning does not apply to it, nor to `between`.
 */
function caseRef<K extends string>(
  operand: FastOperand<K>,
  transform: "lower" | "upper",
): CaseRef<K> {
  const produce = (text: string): string =>
    transform === "lower" ? text.toLowerCase() : text.toUpperCase();

  /** The text of a value the transform can never produce, or `null` when there is nothing to refuse. */
  const otherCase = (value: LiteralArg): string | null => {
    const text = caseSensitiveText(value);
    return text === null || produce(text) === text ? null : text;
  };

  /**
   * @param subject The call and what it could only ever do, which `in` words differently because
   *   the call site passed a list and not the one value named here.
   */
  const refuse = (subject: string, text: string): never => {
    throw new QueryError(
      "NULL_CONSTRAINT",
      `${subject}, because ${transform.toUpperCase()}() transforms the property and not the value you pass. Write ${JSON.stringify(produce(text))} instead.`,
      "constraint.operand2",
    );
  };

  const matchable = (value: LiteralArg, method: string, effect = "can never match"): LiteralArg => {
    const text = otherCase(value);
    if (text !== null) {
      refuse(`${transform}().${method}(${JSON.stringify(text)}) ${effect}`, text);
    }

    return value;
  };

  const fast = (operator: Operator, value: LiteralArg): Comparison<K, "fast"> =>
    qom.comparison(operand, operator, staticOperand(value));

  const matched = (operator: Operator, value: LiteralArg, method: string): Comparison<K, "fast"> =>
    fast(operator, matchable(value, method));

  /** The same guard for the three methods that take literal text and build the pattern themselves. */
  const pattern = (text: string, method: LikeMethod): string => {
    matchable(text, method);
    return likePattern(text, method);
  };

  return {
    eq: (value) => matched(Operator.EQUAL_TO, value, "eq"),
    ne: (value) =>
      fast(Operator.NOT_EQUAL_TO, matchable(value, "ne", "can never exclude anything")),
    lt: (value) => fast(Operator.LESS_THAN, value),
    le: (value) => fast(Operator.LESS_THAN_OR_EQUAL_TO, value),
    gt: (value) => fast(Operator.GREATER_THAN, value),
    ge: (value) => fast(Operator.GREATER_THAN_OR_EQUAL_TO, value),
    like: (value) => matched(Operator.LIKE, value, "like"),
    in: (values) =>
      anyOf<K, "fast">(values, (value, index) => {
        const text = otherCase(value);
        if (text !== null) {
          refuse(
            `${transform}().in([...]) can never match on its value at index ${index}, ${JSON.stringify(text)}`,
            text,
          );
        }

        return fast(Operator.EQUAL_TO, value);
      }),
    between: (low, high) =>
      qom.and(
        fast(Operator.GREATER_THAN_OR_EQUAL_TO, low),
        fast(Operator.LESS_THAN_OR_EQUAL_TO, high),
      ),
    startsWith: (text) => fast(Operator.LIKE, pattern(text, "startsWith")),
    endsWith: (text) => fast(Operator.LIKE, pattern(text, "endsWith")),
    contains: (text) => fast(Operator.LIKE, pattern(text, "contains")),
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
  const like = (value: LiteralArg): Comparison<K, "fast"> =>
    qom.comparison(operand, Operator.LIKE, staticOperand(value));

  return {
    eq: equalTo,
    like,
    in: (values) => anyOf<K, "fast">(values, equalTo),
    startsWith: (text) => like(likePattern(text, "startsWith")),
    endsWith: (text) => like(likePattern(text, "endsWith")),
    contains: (text) => like(likePattern(text, "contains")),
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
    startsWith: (text) => fast(Operator.LIKE, likePattern(text, "startsWith")),
    endsWith: (text) => fast(Operator.LIKE, likePattern(text, "endsWith")),
    contains: (text) => fast(Operator.LIKE, likePattern(text, "contains")),
    asc: () => qom.ascending(operand),
    desc: () => qom.descending(operand),
    exists: () => qom.propertyExistence(selectorName, propertyName),
    notExists: () => qom.not(qom.propertyExistence(selectorName, propertyName)),
    fullText: (expression) =>
      qom.fullTextSearch(selectorName, propertyName, staticOperand(expression)),
    equals: (other) =>
      qom.equiJoinCondition(selectorName, propertyName, other.selectorName, other.propertyName),
    as: (columnName) => qom.column(selectorName, propertyName, columnName ?? null),
    lengthSlow: () => lengthRef(qom.lengthSlow(operand)),
    lower: () => caseRef<K>(qom.lowerCase<K, PropertyValue<K>>(operand), "lower"),
    upper: () => caseRef<K>(qom.upperCase<K, PropertyValue<K>>(operand), "upper"),
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

/**
 * What the compiler prints in place of the node type when `joinSlow()` is called on a builder that
 * declared no alias. It is module local on purpose: it is a message, not a surface.
 */
type JoinNeedsAlias = "call from(nodeType, alias) first, because a join names both sides";

/** The `on()` clause a join needs before the chain continues. A join has no `build()` without it. */
export interface JoinClause<A extends string, C extends string, B extends Bound> {
  /** The join condition, which may name the aliases of both sides. */
  on(condition: Arg<A | C, "aliased", JoinCondition<A | C>>): QueryBuilder<A | C, B, "aliased">;
}

/**
 * An immutable query under construction. `A` is the union of the declared selector names, `B` says
 * whether a limit was set, and `S` says what a callback receives: the one reference of a query
 * started without an alias, or the record keyed by alias.
 */
export interface QueryBuilder<A extends string, B extends Bound, S extends RefShape = "aliased"> {
  /**
   * Phantom marker for the limit state. It exists at compile time only and the object never carries
   * it. It is named `__limit` because the compiler prints this property name next to the value of
   * `B` when a builder without a limit reaches an execution seam.
   */
  readonly __limit?: B;
  /** Adds a constraint that runs on the index. Repeated calls are joined with `AND`. */
  where(constraint: Arg<A, S, Constraint<A, "fast">>): QueryBuilder<A, B, S>;
  /** Adds a constraint of any speed. Repeated calls are joined with `AND`. */
  whereSlow(constraint: Arg<A, S, Constraint<A>>): QueryBuilder<A, B, S>;
  /**
   * Joins another node type. Named `Slow` because Jahia's engine runs both sides unbounded and
   * merges the rows in memory. The chain continues through `on()`.
   *
   * A join names both sides, so it needs a builder that was started with an alias. On a builder
   * started without one, the compiler refuses the node type and prints what to call instead.
   */
  joinSlow<T extends string, C extends string>(
    nodeType: S extends "unaliased" ? JoinNeedsAlias : T,
    alias: C,
    joinType?: JoinType,
  ): JoinClause<A, C, B>;
  /** Appends orderings that Lucene sorts natively. */
  orderBy(...orderings: Arg<A, S, Ordering<A, "fast">>[]): QueryBuilder<A, B, S>;
  /** Appends orderings of any speed. */
  orderBySlow(...orderings: Arg<A, S, Ordering<A>>[]): QueryBuilder<A, B, S>;
  /**
   * Appends columns to the statement. An empty column list writes `SELECT *`.
   *
   * This shapes the statement and nothing else. `getNodesByJCRQuery` and `useJCRQuery` return the
   * nodes of the left selector whatever the columns say, so a named column is not a field of the
   * result. Read the value from the node that comes back.
   */
  select(...columns: Arg<A, S, Column<A>>[]): QueryBuilder<A, B, S>;
  /** Sets the execution limit, which is what makes the builder executable. */
  limit(count: number): QueryBuilder<A, "limitSet", S>;
  /**
   * Runs without a limit. Named `Slow` because the search then walks every hit. It stores `-1`,
   * which is the value the JCR `setLimit` contract reads as unbounded. `diagnose()` reports it as a
   * `full-scan` finding.
   */
  unboundedSlow(): QueryBuilder<A, "limitSet", S>;
  /** Sets the execution offset. It never enters the model. */
  offset(count: number): QueryBuilder<A, B, S>;
  /** Binds values for the bind variables of the model. Repeated calls merge. */
  bind(values: Bindings): QueryBuilder<A, B, S>;
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

/**
 * A builder that may be executed, which is one whose limit was set.
 *
 * It states what the seams read instead of naming a `QueryBuilder`, so that a builder of any
 * selector union and of either callback shape widens to it.
 */
export interface Executable<A extends string = string> {
  /** The limit marker of {@link QueryBuilder}, pinned to the one state that may be executed. */
  readonly __limit?: "limitSet";
  /** See {@link QueryBuilder.build}. */
  build(options?: { strict?: boolean }): QueryModel<A>;
  /** See {@link QueryBuilder.diagnose}. */
  diagnose(): Diagnostic[];
  /** See {@link QueryBuilder.model}. */
  readonly model: QueryModel<A>;
  /** See {@link QueryBuilder.execution}. */
  readonly execution: ExecutionOptions;
}

/** What the execution seams accept: a JCR-SQL2 statement, or a builder that carries its limit. */
export type Queryable = string | Executable;

function resolveArg<A extends string, S extends RefShape, N>(
  arg: Arg<A, S, N>,
  refs: Refs<A, S>,
): N {
  return typeof arg === "function" ? (arg as (r: Refs<A, S>) => N)(refs) : arg;
}

function refsFor<A extends string, S extends RefShape>(
  names: readonly string[],
  shape: S,
): Refs<A, S> {
  if (shape === "unaliased") {
    return selectorRef(names[0]) as Refs<A, S>;
  }

  const selectors: Record<string, SelectorRef<string>> = {};
  for (const name of names) {
    selectors[name] = selectorRef(name);
  }

  // The map is built from the names the source declares, which is exactly the union `A`. The
  // compiler cannot see that, so the shape is asserted once here.
  return selectors as unknown as Refs<A, S>;
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

class Chain<A extends string, B extends Bound, S extends RefShape> implements QueryBuilder<
  A,
  B,
  S
> {
  declare readonly __limit?: B;

  readonly model: QueryModel<A>;
  readonly execution: ExecutionOptions;

  private readonly shape: S;
  private readonly refs: Refs<A, S>;

  constructor(
    source: Source<A>,
    constraint: Constraint<A> | null,
    orderings: readonly Ordering<A>[],
    columns: readonly Column<A>[],
    execution: ExecutionOptions,
    shape: S,
  ) {
    this.model = qom.createQuery(source, constraint, orderings, columns);
    this.execution = execution;
    this.shape = shape;
    this.refs = refsFor<A, S>(declaredSelectors(source), shape);
  }

  private next<B2 extends Bound>(
    constraint: Constraint<A> | null,
    orderings: readonly Ordering<A>[],
    columns: readonly Column<A>[],
    execution: ExecutionOptions,
  ): Chain<A, B2, S> {
    return new Chain<A, B2, S>(
      this.model.source,
      constraint,
      orderings,
      columns,
      execution,
      this.shape,
    );
  }

  private added(constraint: Constraint<A>): Constraint<A> {
    const current = this.model.constraint;
    return current === null ? constraint : qom.and(current, constraint);
  }

  where(constraint: Arg<A, S, Constraint<A, "fast">>): QueryBuilder<A, B, S> {
    return this.whereSlow(constraint);
  }

  whereSlow(constraint: Arg<A, S, Constraint<A>>): QueryBuilder<A, B, S> {
    const resolved = resolveArg(constraint, this.refs);
    return this.next<B>(this.added(resolved), this.model.orderings, this.model.columns, {
      ...this.execution,
    });
  }

  joinSlow<T extends string, C extends string>(
    nodeType: S extends "unaliased" ? JoinNeedsAlias : T,
    alias: C,
    joinType: JoinType = JoinType.INNER,
  ): JoinClause<A, C, B> {
    const right = qom.selector(nodeType as string, alias);
    const refs = refsFor<A | C, "aliased">(
      [...declaredSelectors(this.model.source), alias],
      "aliased",
    );

    return {
      on: (
        condition: Arg<A | C, "aliased", JoinCondition<A | C>>,
      ): QueryBuilder<A | C, B, "aliased"> => {
        const source = qom.joinSlow<A, C>(
          this.model.source,
          right,
          joinType,
          resolveArg(condition, refs),
        );

        return new Chain<A | C, B, "aliased">(
          source,
          this.model.constraint,
          this.model.orderings,
          this.model.columns,
          { ...this.execution },
          "aliased",
        );
      },
    };
  }

  orderBy(...orderings: Arg<A, S, Ordering<A, "fast">>[]): QueryBuilder<A, B, S> {
    return this.orderBySlow(...orderings);
  }

  orderBySlow(...orderings: Arg<A, S, Ordering<A>>[]): QueryBuilder<A, B, S> {
    const resolved = orderings.map((ordering) => resolveArg(ordering, this.refs));
    return this.next<B>(
      this.model.constraint,
      [...this.model.orderings, ...resolved],
      this.model.columns,
      { ...this.execution },
    );
  }

  select(...columns: Arg<A, S, Column<A>>[]): QueryBuilder<A, B, S> {
    const resolved = columns.map((column) => resolveArg(column, this.refs));
    return this.next<B>(
      this.model.constraint,
      this.model.orderings,
      [...this.model.columns, ...resolved],
      { ...this.execution },
    );
  }

  limit(count: number): QueryBuilder<A, "limitSet", S> {
    assertCount(count, "limit()", "execution.limit");
    return this.withExecution<"limitSet">({ limit: count });
  }

  unboundedSlow(): QueryBuilder<A, "limitSet", S> {
    return this.withExecution<"limitSet">({ limit: -1 });
  }

  offset(count: number): QueryBuilder<A, B, S> {
    assertCount(count, "offset()", "execution.offset");
    return this.withExecution<B>({ offset: count });
  }

  bind(values: Bindings): QueryBuilder<A, B, S> {
    if (!values || typeof values !== "object") {
      throw new QueryError(
        "UNSUPPORTED",
        `bind() needs an object of values, got ${String(values)}`,
        "execution.bindings",
      );
    }

    return this.withExecution<B>({ bindings: { ...this.execution.bindings, ...values } });
  }

  private withExecution<B2 extends Bound>(patch: ExecutionOptions): QueryBuilder<A, B2, S> {
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
 * Starts a query over one node type, with or without an alias, or lifts a model the factory built.
 *
 * Without an alias, the callbacks receive the one selector reference, which the call site names:
 * `.where((n) => ...)`. The selector then carries the node type as its name, which is the `SELECT *
 * FROM [jnt:news]` statement. With an alias, the callbacks receive a record keyed by alias, which
 * is what a join needs to tell its two sides apart: `.on(({ c, p }) => ...)`.
 *
 * Every chain call returns a new builder, so one base serves several pages, and the builder is
 * never thenable: nothing runs until an execution seam receives it.
 *
 * @remarks
 *   Jahia support: a query without a limit cannot be executed. `Queryable` accepts a builder whose
 *   limit was set only, and the execution seams throw `UNSUPPORTED` on a builder that reaches them
 *   without one. The escape hatch is `unboundedSlow()`.
 * @example
 *   ```ts
 *   from("jnt:page")
 *     .where((p) => p.prop("jcr:title").eq("Home"))
 *     .limit(20);
 *
 *   from("jnt:contentFolder", "p")
 *     .joinSlow("jnt:event", "c")
 *     .on(({ c, p }) => c.isChildOf(p))
 *     .limit(20);
 *   ```;
 *
 * @experimental The facade is experimental for one minor version.
 */
export function from<T extends string, A extends string>(
  nodeType: T,
  alias: A,
): QueryBuilder<A, NoLimit, "aliased">;
export function from<T extends string>(nodeType: T): QueryBuilder<T, NoLimit, "unaliased">;
export function from<S extends string>(model: QueryModel<S>): QueryBuilder<S, NoLimit, "aliased">;
export function from(
  nodeTypeOrModel: string | QueryModel,
  alias?: string,
): QueryBuilder<string, NoLimit, RefShape> {
  if (typeof nodeTypeOrModel !== "string") {
    const model = nodeTypeOrModel;
    return new Chain<string, NoLimit, "aliased">(
      model.source,
      model.constraint,
      model.orderings,
      model.columns,
      {},
      "aliased",
    );
  }

  return alias === undefined
    ? new Chain<string, NoLimit, "unaliased">(
        qom.selector(nodeTypeOrModel),
        null,
        [],
        [],
        {},
        "unaliased",
      )
    : new Chain<string, NoLimit, "aliased">(
        qom.selector(nodeTypeOrModel, alias),
        null,
        [],
        [],
        {},
        "aliased",
      );
}
