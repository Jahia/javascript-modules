import type {
  Column,
  Constraint,
  DynamicOperand,
  JoinCondition,
  Ordering,
  QueryModel,
  Source,
} from "./model.js";

/**
 * The validation layer. It holds the error type the whole builder throws, the JCR name and path
 * grammars that every factory function checks eagerly, and the cross-node checks that run once a
 * whole query model exists.
 *
 * The eager checks only see their own arguments, so they can check a grammar but not a selector
 * reference. The cross-node checks below resolve every selector name against the source.
 */

/** The closed set of error codes the builder throws. */
export type QueryErrorCode =
  | "INVALID_NAME"
  | "INVALID_PATH"
  | "INVALID_COLUMN"
  | "NULL_CONSTRAINT"
  | "UNDECLARED_SELECTOR"
  | "DUPLICATE_SELECTOR"
  | "MISSING_JOIN_CONDITION"
  | "LITERAL_PRECISION"
  | "UNBOUND_VARIABLE"
  | "LIMIT_CONFLICT"
  | "UNSUPPORTED";

/** Every error the query builder throws. */
export class QueryError extends Error {
  /** What went wrong, as a stable code that a caller can branch on. */
  readonly code: QueryErrorCode;
  /** Where it went wrong, as a path into the model such as `constraint.operand1`. */
  readonly at: string;
  /** The statement the error concerns, when one exists. */
  readonly statement?: string;

  constructor(code: QueryErrorCode, message: string, at: string, statement?: string) {
    super(message);
    this.name = "QueryError";
    this.code = code;
    this.at = at;
    this.statement = statement;
  }
}

/** Reports a node whose `kind` no branch handles, which only a JavaScript caller can produce. */
function unknownKind(node: unknown, at: string): never {
  const kind =
    typeof node === "object" && node !== null && "kind" in node
      ? String((node as { kind: unknown }).kind)
      : String(node);
  throw new QueryError("UNSUPPORTED", `Unknown node kind ${JSON.stringify(kind)}`, at);
}

/*
 * Name and path grammars.
 */

/** An XML NCName, which is what a namespace prefix must be. */
const NAME_PREFIX = /^[A-Za-z_][A-Za-z0-9_.-]*$/;

/** The characters a JCR local name may not contain, see JCR 2.0 section 3.2.2. */
const FORBIDDEN_LOCAL_NAME_CHARS = "/:[]|*";

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) {
      return true;
    }
  }

  return false;
}

/** Tests the local part of a JCR name: the part after the namespace prefix, or the whole name. */
export function isValidLocalName(value: string): boolean {
  if (value.length === 0 || value === "." || value === "..") {
    return false;
  }

  if (hasControlCharacter(value) || value !== value.trim()) {
    return false;
  }

  for (const character of value) {
    if (FORBIDDEN_LOCAL_NAME_CHARS.includes(character)) {
      return false;
    }
  }

  return true;
}

/** Tests a JCR name, with or without a namespace prefix. */
export function isValidName(value: string): boolean {
  const colon = value.indexOf(":");
  if (colon === -1) {
    return isValidLocalName(value);
  }

  return NAME_PREFIX.test(value.slice(0, colon)) && isValidLocalName(value.slice(colon + 1));
}

function isValidPathSegment(segment: string): boolean {
  if (segment === "." || segment === "..") {
    return true;
  }

  const open = segment.indexOf("[");
  if (open === -1) {
    return isValidName(segment);
  }

  return /^\[\d+\]$/.test(segment.slice(open)) && isValidName(segment.slice(0, open));
}

/** Tests a JCR path, absolute or relative, with optional same-name sibling indexes. */
export function isValidPath(value: string): boolean {
  if (value.length === 0) {
    return false;
  }

  if (value === "/") {
    return true;
  }

  const body = value.startsWith("/") ? value.slice(1) : value;
  return body.split("/").every(isValidPathSegment);
}

/**
 * Tests a column name or a column property name. The grammar is looser than the JCR name grammar,
 * so that the Jahia extensions `rep:facet(...)`, `rep:filter(` and `rep:count(approximate=1)` stay
 * expressible. It still rejects `]`, which the fork factory rejects inside a name.
 */
export function isValidColumnPart(value: string): boolean {
  return (
    value.length > 0 &&
    !value.includes("]") &&
    !hasControlCharacter(value) &&
    value === value.trim()
  );
}

/** Throws `INVALID_NAME` unless the value is a JCR name. */
export function assertName(value: string, what: string, at: string): void {
  if (typeof value !== "string" || !isValidName(value)) {
    throw new QueryError(
      "INVALID_NAME",
      `${what} is not a valid JCR name: ${JSON.stringify(value)}`,
      at,
    );
  }
}

/** Throws `INVALID_PATH` unless the value is a JCR path, absolute or relative. */
export function assertPath(value: string, what: string, at: string): void {
  if (typeof value !== "string" || !isValidPath(value)) {
    throw new QueryError(
      "INVALID_PATH",
      `${what} is not a valid JCR path: ${JSON.stringify(value)}`,
      at,
    );
  }
}

/** Throws `INVALID_PATH` unless the value is an absolute JCR path. */
export function assertAbsolutePath(value: string, what: string, at: string): void {
  if (typeof value !== "string" || !value.startsWith("/") || !isValidPath(value)) {
    throw new QueryError(
      "INVALID_PATH",
      `${what} must be an absolute JCR path: ${JSON.stringify(value)}`,
      at,
    );
  }
}

/** Throws `INVALID_COLUMN` unless the value passes the looser column grammar. */
export function assertColumnPart(value: string, what: string, at: string): void {
  if (typeof value !== "string" || !isValidColumnPart(value)) {
    throw new QueryError(
      "INVALID_COLUMN",
      `${what} is not a valid column name: ${JSON.stringify(value)}`,
      at,
    );
  }
}

/*
 * Cross-node checks.
 */

/** One selector name as it appears in the model, with the path of the node that holds it. */
export interface SelectorReference {
  readonly name: string;
  readonly at: string;
}

function collectDeclaredSelectors(source: Source, at: string, out: SelectorReference[]): void {
  if (source === null || typeof source !== "object") {
    return unknownKind(source, at);
  }

  switch (source.kind) {
    case "Selector":
      out.push({ name: source.selectorName, at });
      return;
    case "Join":
      collectDeclaredSelectors(source.left, `${at}.left`, out);
      collectDeclaredSelectors(source.right, `${at}.right`, out);
      return;
    default:
      return unknownKind(source, at);
  }
}

/** Returns every selector name a source declares, in tree order. */
export function declaredSelectors(source: Source, at = "source"): string[] {
  const found: SelectorReference[] = [];
  collectDeclaredSelectors(source, at, found);
  return found.map((reference) => reference.name);
}

/**
 * Checks that a source declares each selector name once and that every join carries a condition.
 * Two sides of a join that share an alias are the case this catches.
 */
export function validateSourceSelectors(source: Source, at = "source"): void {
  const found: SelectorReference[] = [];
  collectDeclaredSelectors(source, at, found);

  const seen = new Set<string>();
  for (const reference of found) {
    if (seen.has(reference.name)) {
      throw new QueryError(
        "DUPLICATE_SELECTOR",
        `Selector name ${JSON.stringify(reference.name)} is declared more than once`,
        reference.at,
      );
    }

    seen.add(reference.name);
  }

  assertJoinConditions(source, at);
}

function assertJoinConditions(source: Source, at: string): void {
  if (source.kind !== "Join") {
    return;
  }

  if (!source.joinCondition) {
    throw new QueryError("MISSING_JOIN_CONDITION", "A join needs a join condition", at);
  }

  assertJoinConditions(source.left, `${at}.left`);
  assertJoinConditions(source.right, `${at}.right`);
}

function collectOperandReferences(
  operand: DynamicOperand,
  at: string,
  out: SelectorReference[],
): void {
  switch (operand.kind) {
    case "PropertyValue":
    case "NodeName":
    case "NodeLocalName":
    case "FullTextSearchScore":
      out.push({ name: operand.selectorName, at });
      return;
    case "Length":
      collectOperandReferences(operand.propertyValue, `${at}.propertyValue`, out);
      return;
    case "LowerCase":
    case "UpperCase":
      collectOperandReferences(operand.operand, `${at}.operand`, out);
      return;
    default:
      return unknownKind(operand, at);
  }
}

function collectJoinConditionReferences(
  condition: JoinCondition,
  at: string,
  out: SelectorReference[],
): void {
  switch (condition.kind) {
    case "EquiJoinCondition":
    case "SameNodeJoinCondition":
      out.push({ name: condition.selector1Name, at }, { name: condition.selector2Name, at });
      return;
    case "ChildNodeJoinCondition":
      out.push(
        { name: condition.childSelectorName, at },
        { name: condition.parentSelectorName, at },
      );
      return;
    case "DescendantNodeJoinCondition":
      out.push(
        { name: condition.descendantSelectorName, at },
        { name: condition.ancestorSelectorName, at },
      );
      return;
    default:
      return unknownKind(condition, at);
  }
}

function collectSourceReferences(source: Source, at: string, out: SelectorReference[]): void {
  if (source.kind !== "Join") {
    return;
  }

  collectJoinConditionReferences(source.joinCondition, `${at}.joinCondition`, out);
  collectSourceReferences(source.left, `${at}.left`, out);
  collectSourceReferences(source.right, `${at}.right`, out);
}

function collectConstraintReferences(
  constraint: Constraint,
  at: string,
  out: SelectorReference[],
): void {
  switch (constraint.kind) {
    case "And":
    case "Or":
      collectConstraintReferences(constraint.constraint1, `${at}.constraint1`, out);
      collectConstraintReferences(constraint.constraint2, `${at}.constraint2`, out);
      return;
    case "Not":
      collectConstraintReferences(constraint.constraint, `${at}.constraint`, out);
      return;
    case "Comparison":
      collectOperandReferences(constraint.operand1, `${at}.operand1`, out);
      return;
    case "PropertyExistence":
    case "FullTextSearch":
    case "SameNode":
    case "ChildNode":
    case "DescendantNode":
      out.push({ name: constraint.selectorName, at });
      return;
    default:
      return unknownKind(constraint, at);
  }
}

/** Returns every selector name the model refers to, outside the selector declarations themselves. */
export function selectorReferences(model: QueryModel): SelectorReference[] {
  const found: SelectorReference[] = [];
  collectSourceReferences(model.source, "source", found);

  if (model.constraint) {
    collectConstraintReferences(model.constraint, "constraint", found);
  }

  model.orderings.forEach((ordering: Ordering, index: number) => {
    collectOperandReferences(ordering.operand, `orderings[${index}].operand`, found);
  });

  model.columns.forEach((column: Column, index: number) => {
    found.push({ name: column.selectorName, at: `columns[${index}]` });
  });

  return found;
}

/**
 * Checks that every selector name the model refers to resolves to a selector the source declares.
 * Join conditions, constraints, orderings and columns are all covered.
 */
export function validateSelectorReferences(model: QueryModel): void {
  const declared = new Set(declaredSelectors(model.source));

  for (const reference of selectorReferences(model)) {
    if (!declared.has(reference.name)) {
      throw new QueryError(
        "UNDECLARED_SELECTOR",
        `Selector name ${JSON.stringify(reference.name)} is not declared by the source`,
        reference.at,
      );
    }
  }
}

/** Runs every cross-node check over a query model. It throws on the first failure. */
export function validateModel(model: QueryModel): void {
  validateSourceSelectors(model.source);
  validateSelectorReferences(model);
}
