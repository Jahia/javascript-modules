/**
 * The wire constants of `javax.jcr.query.qom.QueryObjectModelConstants`, and the table that maps a
 * literal type to its `javax.jcr.PropertyType` code and to the name the formatter writes in a
 * `CAST`.
 *
 * The `java-ts-bind` generator emits no constant fields, so these values are declared here. They
 * are part of the JSON form of the model and the sink passes them to the host factory unchanged.
 */

/** Comparison operators, as `QueryObjectModelConstants` spells them. */
export const Operator = {
  /** `=` */
  EQUAL_TO: "jcr.operator.equal.to",
  /** `<>`. Jackrabbit excludes multi-valued properties from the result. */
  NOT_EQUAL_TO: "jcr.operator.not.equal.to",
  /** `<` */
  LESS_THAN: "jcr.operator.less.than",
  /** `<=` */
  LESS_THAN_OR_EQUAL_TO: "jcr.operator.less.than.or.equal.to",
  /** `>` */
  GREATER_THAN: "jcr.operator.greater.than",
  /** `>=` */
  GREATER_THAN_OR_EQUAL_TO: "jcr.operator.greater.than.or.equal.to",
  /** `LIKE`, with `%` and `_` as wildcards. */
  LIKE: "jcr.operator.like",
} as const;

/** The seven comparison operators, as a string literal union. */
export type Operator = (typeof Operator)[keyof typeof Operator];

/** Join types, as `QueryObjectModelConstants` spells them. */
export const JoinType = {
  /** `INNER JOIN` */
  INNER: "jcr.join.type.inner",
  /** `LEFT OUTER JOIN` */
  LEFT_OUTER: "jcr.join.type.left.outer",
  /** `RIGHT OUTER JOIN`. Jahia's engine runs it as a left outer join with the sides swapped. */
  RIGHT_OUTER: "jcr.join.type.right.outer",
} as const;

/** The three join types, as a string literal union. */
export type JoinType = (typeof JoinType)[keyof typeof JoinType];

/** Ordering directions, as `QueryObjectModelConstants` spells them. */
export const Order = {
  /** `ASC`, which the formatter never writes because it is the default. */
  ASCENDING: "jcr.order.ascending",
  /** `DESC` */
  DESCENDING: "jcr.order.descending",
} as const;

/** The two ordering directions, as a string literal union. */
export type Order = (typeof Order)[keyof typeof Order];

/**
 * The literal types the builder can construct. `UNDEFINED` is not representable, because the
 * formatter renders it to nothing. `BINARY` is excluded in v1, because a binary literal has no
 * meaningful comparison in Jackrabbit.
 */
export type LiteralType =
  | "String"
  | "Long"
  | "Double"
  | "Decimal"
  | "Date"
  | "Boolean"
  | "Name"
  | "Path"
  | "Reference"
  | "WeakReference"
  | "URI";

/**
 * Each literal type with its `javax.jcr.PropertyType` code, which the sink passes to
 * `ValueFactory.createValue(String, int)`, and with the name the formatter writes inside a `CAST`.
 * The two alphabets differ, so the mapping is explicit.
 */
export const LiteralTypes = {
  String: { propertyType: 1, castName: "STRING" },
  Long: { propertyType: 3, castName: "LONG" },
  Double: { propertyType: 4, castName: "DOUBLE" },
  Date: { propertyType: 5, castName: "DATE" },
  Boolean: { propertyType: 6, castName: "BOOLEAN" },
  Name: { propertyType: 7, castName: "NAME" },
  Path: { propertyType: 8, castName: "PATH" },
  Reference: { propertyType: 9, castName: "REFERENCE" },
  WeakReference: { propertyType: 10, castName: "WEAKREFERENCE" },
  URI: { propertyType: 11, castName: "URI" },
  Decimal: { propertyType: 12, castName: "DECIMAL" },
} as const satisfies Record<LiteralType, { propertyType: number; castName: string }>;

/**
 * The largest offset Jackrabbit serves from one search. Past it, `SortedLuceneQueryHits` runs the
 * search again with a doubled heap.
 */
export const DEEP_OFFSET_THRESHOLD = 32768;
