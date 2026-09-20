import type { ValueFactory } from "javax.jcr";
import type * as host from "javax.jcr.query.qom";
import type { JCRSessionWrapper } from "org.jahia.services.content";
import { LiteralTypes, Order } from "./constants.js";
import { literal as toLiteral } from "./literal.js";
import type { Bindings, LiteralValue } from "./literal.js";
import type {
  Column,
  Constraint,
  DynamicOperand,
  JoinCondition,
  Literal,
  Ordering,
  PropertyValue,
  QueryModel,
  Source,
  StaticOperand,
} from "./model.js";
import { QueryError, declaredSelectors, validateModel } from "./validate.js";

/**
 * The QOM interop sink. It walks a query model and calls one host factory method per node, so that
 * the executed object is the same `QueryObjectModel` a parsed JCR-SQL2 statement produces.
 *
 * This file and `execute.ts` are the only two files of the query builder that reach the host. The
 * walk is post-order: a node is built after the nodes it holds, because the host factory takes
 * built objects as arguments.
 */

/**
 * The members of `QueryObjectModelFactory` this sink calls, with the three slots the specification
 * allows to be empty widened to accept `null`.
 *
 * The generated declarations carry no nullability information, so `createQuery(source, null, ...)`,
 * `column(selector, null, null)` and `fullTextSearch(selector, null, expression)` do not type check
 * against them. Patching the generated declarations was rejected in phase 0: it would change the
 * published types of the whole library for these three call sites. The factory is cast once
 * instead, which is the technique `execute.ts` uses for the query result.
 */
interface QOMFactoryLike extends Omit<
  host.QueryObjectModelFactory,
  "column" | "createQuery" | "fullTextSearch"
> {
  createQuery(
    source: host.Source,
    constraint: host.Constraint | null,
    orderings: host.Ordering[],
    columns: host.Column[],
  ): host.QueryObjectModel;
  column(selectorName: string, propertyName: string | null, columnName: string | null): host.Column;
  fullTextSearch(
    selectorName: string,
    propertyName: string | null,
    fullTextSearchExpression: host.StaticOperand,
  ): host.FullTextSearch;
}

/** What every walk function needs: the host factory, the value factory and the bound values. */
interface Sink {
  readonly factory: QOMFactoryLike;
  readonly values: ValueFactory;
  readonly bindings: Bindings;
}

/** Reports a node whose `kind` no branch handles, which only a JavaScript caller can produce. */
function unknownKind(node: never, at: string): never {
  const kind = (node as { kind?: unknown }).kind;
  throw new QueryError("UNSUPPORTED", `Unknown node kind ${JSON.stringify(String(kind))}`, at);
}

function unbound(bindVariableName: string, at: string): QueryError {
  return new QueryError(
    "UNBOUND_VARIABLE",
    `The bind variable ${JSON.stringify(bindVariableName)} has no value. Pass it to bind() before the query runs`,
    at,
  );
}

/**
 * Collects the bind variables a constraint tree holds. A `BindVariableValue` is a static operand,
 * and the only two slots that take one are `Comparison.operand2` and
 * `FullTextSearch.fullTextSearchExpression`, so nothing outside the constraint tree can hold one.
 */
function collectBindVariables(
  constraint: Constraint,
  at: string,
  out: { name: string; at: string }[],
): void {
  switch (constraint.kind) {
    case "And":
    case "Or":
      collectBindVariables(constraint.constraint1, `${at}.constraint1`, out);
      collectBindVariables(constraint.constraint2, `${at}.constraint2`, out);
      return;
    case "Not":
      collectBindVariables(constraint.constraint, `${at}.constraint`, out);
      return;
    case "Comparison":
      if (constraint.operand2.kind === "BindVariableValue") {
        out.push({ name: constraint.operand2.bindVariableName, at: `${at}.operand2` });
      }

      return;
    case "FullTextSearch":
      if (constraint.fullTextSearchExpression.kind === "BindVariableValue") {
        out.push({
          name: constraint.fullTextSearchExpression.bindVariableName,
          at: `${at}.fullTextSearchExpression`,
        });
      }

      return;
    default:
      return;
  }
}

/** Throws `UNBOUND_VARIABLE` for the first variable without a value, before any host call. */
function assertEveryVariableBound(model: QueryModel, bindings: Bindings): void {
  if (!model.constraint) {
    return;
  }

  const found: { name: string; at: string }[] = [];
  collectBindVariables(model.constraint, "constraint", found);

  for (const variable of found) {
    const bound: LiteralValue | Literal | undefined = bindings[variable.name];
    if (bound === undefined) {
      throw unbound(variable.name, variable.at);
    }
  }
}

function hostLiteral(sink: Sink, node: Literal): host.Literal {
  // `createValue(42, 3)` has no applicable overload on the host, and `createValue('42', 3)` works,
  // so every literal travels as its string form with its `PropertyType` code.
  return sink.factory.literal(
    sink.values.createValue(String(node.value), LiteralTypes[node.type].propertyType),
  );
}

function staticOperand(sink: Sink, node: StaticOperand, at: string): host.StaticOperand {
  switch (node.kind) {
    case "Literal":
      return hostLiteral(sink, node);
    case "BindVariableValue": {
      // `bindValue` fails on Jahia's QOM proxy at execution time, so the value is inlined as a
      // typed literal here instead.
      const bound: LiteralValue | Literal | undefined = sink.bindings[node.bindVariableName];
      if (bound === undefined) {
        throw unbound(node.bindVariableName, at);
      }

      return hostLiteral(sink, toLiteral(bound));
    }

    default:
      return unknownKind(node, at);
  }
}

function propertyValue(sink: Sink, node: PropertyValue): host.PropertyValue {
  return sink.factory.propertyValue(node.selectorName, node.propertyName);
}

function dynamicOperand(sink: Sink, node: DynamicOperand, at: string): host.DynamicOperand {
  switch (node.kind) {
    case "PropertyValue":
      return propertyValue(sink, node);
    case "Length":
      return sink.factory.length(propertyValue(sink, node.propertyValue));
    case "NodeName":
      return sink.factory.nodeName(node.selectorName);
    case "NodeLocalName":
      return sink.factory.nodeLocalName(node.selectorName);
    case "FullTextSearchScore":
      return sink.factory.fullTextSearchScore(node.selectorName);
    case "LowerCase":
      return sink.factory.lowerCase(dynamicOperand(sink, node.operand, `${at}.operand`));
    case "UpperCase":
      return sink.factory.upperCase(dynamicOperand(sink, node.operand, `${at}.operand`));
    default:
      return unknownKind(node, at);
  }
}

function hostConstraint(sink: Sink, node: Constraint, at: string): host.Constraint {
  switch (node.kind) {
    case "And":
      return sink.factory.and(
        hostConstraint(sink, node.constraint1, `${at}.constraint1`),
        hostConstraint(sink, node.constraint2, `${at}.constraint2`),
      );
    case "Or":
      return sink.factory.or(
        hostConstraint(sink, node.constraint1, `${at}.constraint1`),
        hostConstraint(sink, node.constraint2, `${at}.constraint2`),
      );
    case "Not":
      return sink.factory.not(hostConstraint(sink, node.constraint, `${at}.constraint`));
    case "Comparison":
      return sink.factory.comparison(
        dynamicOperand(sink, node.operand1, `${at}.operand1`),
        node.operator,
        staticOperand(sink, node.operand2, `${at}.operand2`),
      );
    case "PropertyExistence":
      return sink.factory.propertyExistence(node.selectorName, node.propertyName);
    case "FullTextSearch":
      return sink.factory.fullTextSearch(
        node.selectorName,
        node.propertyName,
        staticOperand(sink, node.fullTextSearchExpression, `${at}.fullTextSearchExpression`),
      );
    case "SameNode":
      return sink.factory.sameNode(node.selectorName, node.path);
    case "ChildNode":
      return sink.factory.childNode(node.selectorName, node.parentPath);
    case "DescendantNode":
      return sink.factory.descendantNode(node.selectorName, node.ancestorPath);
    default:
      return unknownKind(node, at);
  }
}

function hostJoinCondition(sink: Sink, node: JoinCondition, at: string): host.JoinCondition {
  switch (node.kind) {
    case "EquiJoinCondition":
      return sink.factory.equiJoinCondition(
        node.selector1Name,
        node.property1Name,
        node.selector2Name,
        node.property2Name,
      );
    case "SameNodeJoinCondition":
      return sink.factory.sameNodeJoinCondition(
        node.selector1Name,
        node.selector2Name,
        node.selector2Path,
      );
    case "ChildNodeJoinCondition":
      return sink.factory.childNodeJoinCondition(node.childSelectorName, node.parentSelectorName);
    case "DescendantNodeJoinCondition":
      return sink.factory.descendantNodeJoinCondition(
        node.descendantSelectorName,
        node.ancestorSelectorName,
      );
    default:
      return unknownKind(node, at);
  }
}

function hostSource(sink: Sink, node: Source, at: string): host.Source {
  switch (node.kind) {
    case "Selector":
      return sink.factory.selector(node.nodeTypeName, node.selectorName);
    case "Join":
      return sink.factory.join(
        hostSource(sink, node.left, `${at}.left`),
        hostSource(sink, node.right, `${at}.right`),
        node.joinType,
        hostJoinCondition(sink, node.joinCondition, `${at}.joinCondition`),
      );
    default:
      return unknownKind(node, at);
  }
}

function hostOrdering(sink: Sink, node: Ordering, at: string): host.Ordering {
  const operand = dynamicOperand(sink, node.operand, `${at}.operand`);
  return node.order === Order.DESCENDING
    ? sink.factory.descending(operand)
    : sink.factory.ascending(operand);
}

function hostColumn(sink: Sink, node: Column): host.Column {
  return sink.factory.column(node.selectorName, node.propertyName, node.columnName);
}

/**
 * Builds the host `QueryObjectModel` a model describes, through the factory of the session.
 *
 * The factory is Jahia's proxy over the default provider, and the value factory is the
 * `JCRValueFactoryImpl` singleton. Every bind variable is replaced by a typed literal, because the
 * proxy rejects `bindValue` at execution time. A variable without a value throws `UNBOUND_VARIABLE`
 * before the first host call.
 *
 * An empty column list becomes one wildcard column per selector, which is what the JCR-SQL2 parser
 * writes for `SELECT *` over a join. The internationalisation rewrite then sees a property based
 * node on each selector.
 *
 * `createQuery` rewrites the four parts before the object model exists, so `getStatement()` on the
 * returned object reports the rewritten query. In a localised session the rewrite adds a
 * `jcr:language` constraint to every selector that carries none.
 *
 * @param model The query model, as `build()` or the factory returns it.
 * @param session The JCR session the query runs in.
 * @param bindings The values of the bind variables the model holds.
 * @returns The host query object, ready for `setLimit`, `setOffset` and `execute`.
 */
export function toQOM(
  model: QueryModel,
  session: JCRSessionWrapper,
  bindings: Bindings = {},
): host.QueryObjectModel {
  validateModel(model);
  assertEveryVariableBound(model, bindings);

  const factory = session
    .getWorkspace()
    .getQueryManager()
    .getQOMFactory() as unknown as QOMFactoryLike;
  const sink: Sink = { factory, values: session.getValueFactory(), bindings };

  const source = hostSource(sink, model.source, "source");
  const constraint = model.constraint ? hostConstraint(sink, model.constraint, "constraint") : null;
  const orderings = model.orderings.map((ordering, index) =>
    hostOrdering(sink, ordering, `orderings[${index}]`),
  );
  const columns =
    model.columns.length > 0
      ? model.columns.map((column) => hostColumn(sink, column))
      : declaredSelectors(model.source).map((selectorName) =>
          factory.column(selectorName, null, null),
        );

  return factory.createQuery(source, constraint, orderings, columns);
}
