/**
 * The JCR query builder, modeled on `javax.jcr.query.qom`.
 *
 * This index is the surface of the pure layer: the query model, the wire constants, the literal
 * constructors, the factory that mirrors `QueryObjectModelFactory`, the cross-node checks and
 * `diagnose()`. The fluent facade and the host sinks come on top of it.
 */

// Constants
export { DEEP_OFFSET_THRESHOLD, JoinType, LiteralTypes, Operator, Order } from "./constants.js";
export type { LiteralType } from "./constants.js";

// Factory
export { qom, unchecked } from "./factory.js";

// Literals and bind variables
export {
  $,
  bindVariable,
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
export type { Bindings, LiteralArg, LiteralValue } from "./literal.js";

// Diagnostics
export { diagnose } from "./diagnostics.js";
export type { Diagnostic, DiagnosticLevel, ExecutionOptions } from "./diagnostics.js";

// Errors and validation
export { QueryError } from "./validate.js";
export type { QueryErrorCode, SelectorReference } from "./validate.js";
export {
  declaredSelectors,
  isValidColumnPart,
  isValidLocalName,
  isValidName,
  isValidPath,
  selectorReferences,
  validateModel,
  validateSelectorReferences,
  validateSourceSelectors,
} from "./validate.js";

// Model
export type {
  And,
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
  Join,
  JoinCondition,
  Length,
  Literal,
  LowerCase,
  NodeLocalName,
  NodeName,
  Not,
  Operand,
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
