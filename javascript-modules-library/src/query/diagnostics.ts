import { DEEP_OFFSET_THRESHOLD, JoinType, Operator } from "./constants.js";
import type { Bindings } from "./literal.js";
import type {
  Column,
  Comparison,
  Constraint,
  DynamicOperand,
  Ordering,
  QueryModel,
  Source,
  StaticOperand,
} from "./model.js";

/**
 * The second support signal, next to the `Slow` suffix in the names. `diagnose()` reports what the
 * name at the call site cannot show: constructs Jahia's Jackrabbit runs with other semantics or not
 * at all, the cost of the execution options, and the conditions the model cannot see.
 */

/**
 * How a finding affects the query.
 *
 * A construct that Jackrabbit runs in memory has no level of its own, because the `Slow` suffix in
 * its name already says so at the call site.
 *
 * - `none`: the query fails. A finding that also carries `conditional` fails under a condition the
 *   model cannot see, so the strict gate reports it and lets it through.
 * - `partial`: the query runs with different semantics.
 * - `deep-offset`: the offset makes the search run again with a doubled heap.
 * - `full-scan`: the hit loop never breaks early.
 * - `environment`: the cost or the outcome depends on a setting or an installation detail that the
 *   model cannot show. It is raised by the construct it concerns, so a query without such a
 *   construct carries no `environment` finding.
 */
export type DiagnosticLevel = "none" | "partial" | "deep-offset" | "full-scan" | "environment";

/** One finding, with the path of the node it concerns. */
export interface Diagnostic {
  readonly level: DiagnosticLevel;
  readonly at: string;
  readonly reason: string;
  /**
   * `true` on a `none` finding whose failure needs a condition the model cannot see. The query runs
   * in every other condition, so `build({ strict: true })` and the execution seams report such a
   * finding and do not refuse the query.
   */
  readonly conditional?: boolean;
}

/** The values that travel next to the model, and that the model never carries. */
export interface ExecutionOptions {
  readonly limit?: number;
  readonly offset?: number;
  readonly bindings?: Bindings;
}

const NATIVE_SORT_REASON =
  "This query is ordered, and Jahia sorts an ordering in Lucene only while jahia.jackrabbit.useNativeSort is true, which is the default. With that setting off, every accepted row is listed and sorted in memory, so the limit no longer bounds the search.";

const PROVIDERS_REASON =
  "This query skips rows, and an offset is applied per JCR provider. On an installation that mounts a provider next to the default one, provider 1 runs once more without a limit when it returns no row under the offset.";

const I18N_REWRITE_REASON =
  "The query rewriter rebuilds a NOT or an UPPER with a null child once it has changed the node under it, and the query then fails. It changes that node for a property it moves to a jnt:translation selector, which needs an internationalised property in a localised session. The model sees neither condition, so this finding reports the risk and does not refuse the query.";

function innermostOperand(operand: DynamicOperand): DynamicOperand {
  let current = operand;
  while (current.kind === "LowerCase" || current.kind === "UpperCase") {
    current = current.operand;
  }

  return current;
}

function transformDepth(operand: DynamicOperand): number {
  let depth = 0;
  let current = operand;
  while (current.kind === "LowerCase" || current.kind === "UpperCase") {
    depth++;
    current = current.operand;
  }

  return depth;
}

function hasUpperCase(operand: DynamicOperand): boolean {
  let current = operand;
  while (current.kind === "LowerCase" || current.kind === "UpperCase") {
    if (current.kind === "UpperCase") {
      return true;
    }

    current = current.operand;
  }

  return false;
}

function referencesProperty(constraint: Constraint): boolean {
  switch (constraint.kind) {
    case "And":
    case "Or":
      return (
        referencesProperty(constraint.constraint1) || referencesProperty(constraint.constraint2)
      );
    case "Not":
      return referencesProperty(constraint.constraint);
    case "Comparison":
      return innermostOperand(constraint.operand1).kind === "PropertyValue";
    case "PropertyExistence":
    case "FullTextSearch":
      return true;
    default:
      return false;
  }
}

function diagnoseStaticOperand(operand: StaticOperand, at: string, found: Diagnostic[]): void {
  if (operand.kind === "Literal" && operand.type === "Reference") {
    found.push({
      level: "partial",
      at,
      reason:
        "JCRValueFactoryImpl builds a weak reference for both reference types, so a REFERENCE literal executes as a WEAKREFERENCE one.",
    });
  }
}

function diagnoseOperandTransforms(operand: DynamicOperand, at: string, found: Diagnostic[]): void {
  if (transformDepth(operand) >= 2) {
    found.push({
      level: "partial",
      at,
      reason: "Nested LOWER and UPPER collapse to the outer transform.",
    });
  }

  if (hasUpperCase(operand) && innermostOperand(operand).kind === "PropertyValue") {
    found.push({ level: "none", conditional: true, at, reason: I18N_REWRITE_REASON });
  }
}

function diagnoseComparison(constraint: Comparison, at: string, found: Diagnostic[]): void {
  const operand = constraint.operand1;
  const base = innermostOperand(operand);
  const transformed = transformDepth(operand) > 0;

  diagnoseOperandTransforms(operand, `${at}.operand1`, found);

  switch (base.kind) {
    case "PropertyValue":
      if (constraint.operator === Operator.NOT_EQUAL_TO) {
        found.push({
          level: "partial",
          at,
          reason: "A <> comparison on a property excludes multi-valued properties from the result.",
        });
      }

      if (
        base.propertyName === "jcr:language" &&
        constraint.operand2.kind === "BindVariableValue"
      ) {
        found.push({
          level: "none",
          at,
          reason:
            "jcr:language compared with a bind variable fails with a ClassCastException in the query rewriter.",
        });
      }

      break;
    case "NodeName":
      if (!transformed && constraint.operator === Operator.LIKE) {
        found.push({
          level: "none",
          at,
          reason:
            "NAME() with LIKE and no case transform fails with an UnsupportedRepositoryOperationException.",
        });
      }

      break;
    default:
      break;
  }

  diagnoseStaticOperand(constraint.operand2, `${at}.operand2`, found);
}

function diagnoseConstraint(constraint: Constraint, at: string, found: Diagnostic[]): void {
  switch (constraint.kind) {
    case "And":
    case "Or":
      diagnoseConstraint(constraint.constraint1, `${at}.constraint1`, found);
      diagnoseConstraint(constraint.constraint2, `${at}.constraint2`, found);
      return;
    case "Not":
      if (referencesProperty(constraint.constraint)) {
        found.push({ level: "none", conditional: true, at, reason: I18N_REWRITE_REASON });
      }

      diagnoseConstraint(constraint.constraint, `${at}.constraint`, found);
      return;
    case "Comparison":
      diagnoseComparison(constraint, at, found);
      return;
    case "FullTextSearch":
      diagnoseStaticOperand(
        constraint.fullTextSearchExpression,
        `${at}.fullTextSearchExpression`,
        found,
      );
      return;
    default:
      return;
  }
}

function diagnoseSource(source: Source, at: string, found: Diagnostic[]): void {
  if (source.kind !== "Join") {
    return;
  }

  found.push({
    level: "full-scan",
    at,
    reason:
      "Jahia's engine runs both sides of a join with offset 0 and limit -1 and merges the rows in memory, so no limit reaches Lucene and the hit loop never breaks early.",
  });

  if (source.joinType === JoinType.RIGHT_OUTER) {
    found.push({
      level: "partial",
      at,
      reason: "Jahia's engine runs a RIGHT OUTER join as a LEFT OUTER one with the sides swapped.",
    });
  }

  diagnoseSource(source.left, `${at}.left`, found);
  diagnoseSource(source.right, `${at}.right`, found);
}

function diagnoseOrdering(ordering: Ordering, at: string, found: Diagnostic[]): void {
  diagnoseOperandTransforms(ordering.operand, `${at}.operand`, found);
}

function diagnoseColumn(column: Column, at: string, found: Diagnostic[]): void {
  const text = [column.propertyName, column.columnName].filter((part) => part !== null).join(" ");

  if (text.includes("rep:facet")) {
    found.push({
      level: "full-scan",
      at,
      reason:
        "A rep:facet column sets a bit for every readable hit, and the hit loop never breaks.",
    });
    return;
  }

  if (text.includes("rep:count") && !text.includes("approximate=1")) {
    found.push({
      level: "full-scan",
      at,
      reason:
        "An exact rep:count column reads one document per hit and never breaks early. Add approximate=1 for a bounded estimate.",
    });
  }
}

function diagnoseExecution(execution: ExecutionOptions, found: Diagnostic[]): void {
  // An earlier revision left an unbounded execution to the `unboundedSlow()` name alone. The name
  // is at the call site and the finding is at the review, and a query that returns every matching
  // node is the costliest thing this layer can report, so it is reported here as well.
  if (execution.limit !== undefined && execution.limit < 0) {
    found.push({
      level: "full-scan",
      at: "execution.limit",
      reason: "This query returns every matching node.",
    });
  }

  // The Lucene heap is `clamp(offset + limit, 32, 32768)`, and it refills by doubling once the hit
  // loop walks past it, so the offset alone does not say whether a refill happens. A negative limit
  // means unbounded, so it does not widen the window here.
  const window = (execution.offset ?? 0) + Math.max(execution.limit ?? 0, 0);

  if (window > DEEP_OFFSET_THRESHOLD) {
    found.push({
      level: "deep-offset",
      at: "execution",
      reason: `offset + limit is ${window}, above ${DEEP_OFFSET_THRESHOLD}, so Jackrabbit clamps the heap and runs the search again with a doubled heap. Use keyset pagination instead.`,
    });
  }

  if ((execution.offset ?? 0) > 0) {
    found.push({ level: "environment", at: "execution.offset", reason: PROVIDERS_REASON });
  }
}

/**
 * Reports what the model and the execution options say about how Jahia's Jackrabbit will run this
 * query.
 *
 * A query that carries nothing worth reporting returns an empty array, so a caller can treat any
 * finding as a signal. An `environment` finding is raised by a construct whose cost depends on a
 * condition the model cannot show, and never on its own. An ordering always raises one, because the
 * native sort setting always decides how an ordering runs.
 *
 * @param model The query model to inspect.
 * @param execution The limit, offset and bindings, when they are known. Without them, the findings
 *   that read the limit and the offset are left out.
 * @returns Every finding, in model order, then the findings of the execution options. An empty
 *   array means that nothing was found.
 */
export function diagnose(model: QueryModel, execution?: ExecutionOptions): Diagnostic[] {
  const found: Diagnostic[] = [];

  diagnoseSource(model.source, "source", found);

  if (model.constraint) {
    diagnoseConstraint(model.constraint, "constraint", found);
  }

  model.orderings.forEach((ordering: Ordering, index: number) => {
    diagnoseOrdering(ordering, `orderings[${index}]`, found);
  });

  if (model.orderings.length > 0) {
    found.push({ level: "environment", at: "orderings", reason: NATIVE_SORT_REASON });
  }

  model.columns.forEach((column: Column, index: number) => {
    diagnoseColumn(column, `columns[${index}]`, found);
  });

  if (execution) {
    diagnoseExecution(execution, found);
  }

  return found;
}
