import type { RowIterator } from "javax.jcr.query";
import type { JCRNodeIteratorWrapper, JCRSessionWrapper } from "org.jahia.services.content";
import type { Executable, Queryable } from "./builder.js";
import { toQOM } from "./qom.js";
import { QueryError } from "./validate.js";

/**
 * The execution entry of the query builder. It is internal in v1: the public seams are
 * `getNodesByJCRQuery` and `useJCRQuery`, and neither the library root nor the query index exports
 * this file.
 *
 * It is the only caller of `setLimit` and `setOffset` in the whole library, so no layer slices the
 * result in JavaScript. It is also where the limit rule holds at run time: a builder that carries
 * no limit never reaches the host.
 *
 * Two routes stay outside this rule, and both leave the library. `toQOM` hands back the host query
 * object, and `execute()` on that object runs whatever it was built from. A query built through the
 * session's own query manager never enters the library at all. The querying guide says so where it
 * uses each of them.
 */

/**
 * What Jahia hands back from `execute()`. The specification types the return value as
 * `javax.jcr.query.QueryResult`, whose `getNodes()` yields the bare JCR nodes, while the runtime
 * object is Jahia's `QueryResultWrapper` on both the string and the object model path. The result
 * is cast once to this shape, so that callers read the wrapped nodes.
 */
export interface QueryResultLike {
  /** The nodes of the result, and of the left selector for a join, one per row. */
  getNodes(): JCRNodeIteratorWrapper;
  /** The rows of the result, which give column access. */
  getRows(): RowIterator;
}

/** The members of a prepared query this layer calls, common to both execution paths. */
interface QueryLike {
  setLimit(limit: number): void;
  setOffset(offset: number): void;
  execute(): QueryResultLike;
}

/** The execution values a caller may pass next to the query itself. */
export interface ExecuteOptions {
  /** The maximum number of rows, where `-1` means unbounded and no call to `setLimit`. */
  readonly limit?: number;
  /** The number of rows to skip. */
  readonly offset?: number;
}

/**
 * Takes the value the query carries and the value the call passes, and returns the one that is set.
 * Two values are a mistake, because only one of them can win silently.
 */
function singleValue(
  carried: number | undefined,
  positional: number | undefined,
  what: "limit" | "offset",
): number | undefined {
  if (carried !== undefined && positional !== undefined) {
    throw new QueryError(
      "LIMIT_CONFLICT",
      `The query carries a ${what} of ${carried} and the call passes ${positional}. Set it on the query or in the call, not in both`,
      `execution.${what}`,
    );
  }

  return carried ?? positional;
}

function run(
  query: QueryLike,
  limit: number | undefined,
  offset: number | undefined,
): QueryResultLike {
  if (limit !== undefined && limit >= 0) {
    query.setLimit(limit);
  }

  if (offset !== undefined && offset > 0) {
    query.setOffset(offset);
  }

  return query.execute();
}

function runStatement(
  session: JCRSessionWrapper,
  statement: string,
  options: ExecuteOptions,
): QueryResultLike {
  const query: QueryLike = session
    .getWorkspace()
    .getQueryManager()
    .createQuery(statement, "JCR-SQL2");
  // A statement caller already holds the text it passed, so this path logs nothing and keeps the
  // output of the existing seams unchanged.
  return run(query, options.limit, options.offset);
}

function runBuilder(
  session: JCRSessionWrapper,
  builder: Executable,
  options: ExecuteOptions,
): QueryResultLike {
  const limit = singleValue(builder.execution.limit, options.limit, "limit");
  const offset = singleValue(builder.execution.offset, options.offset, "offset");

  // The type state of the builder refuses a query without a limit at compile time, and a
  // JavaScript caller, an `as` cast or a loosely typed wrapper walks past that check. The same rule
  // is therefore enforced here, so that the limit holds for every caller and not only for the typed
  // one.
  if (limit === undefined) {
    throw new QueryError(
      "UNSUPPORTED",
      "This query carries no limit, so it would return every node it matches. Call limit(n) on the query, or call unboundedSlow() when you really want every matching node",
      "execution.limit",
    );
  }

  // `strict` throws `UNSUPPORTED` on a diagnostic whose level is `none` and that is not marked
  // `conditional`, which is a query that fails at execution whatever the environment. It runs
  // before the first host call.
  const model = builder.build({ strict: true });
  const query = toQOM(model, session, builder.execution.bindings);

  // `getStatement()` is the only text form a built query has, so it is logged here. The statement
  // path logs nothing, because the caller already holds the string it passed.
  console.debug(`Running JCR query: ${query.getStatement()}`);

  // The specification types the object model as a query, and the runtime object carries the nodes
  // of the Jahia wrapper, which is what `QueryResultLike` describes.
  return run(query as unknown as QueryLike, limit, offset);
}

/**
 * Runs a query and returns its result.
 *
 * A statement goes through `createQuery(statement, "JCR-SQL2")`, and a builder goes through the
 * object model sink. A builder carries its own limit, offset and bindings, so passing one of them
 * in `options` as well throws `LIMIT_CONFLICT`. A built query logs its `getStatement()` at debug
 * level, which is the only text form it has; a statement is not logged, because the caller already
 * holds it.
 *
 * A builder that carries no limit throws `UNSUPPORTED`, whatever the caller's language, because the
 * compile-time rule alone leaves the door open to a JavaScript caller and to an `as` cast.
 *
 * @param session The JCR session the query runs in.
 * @param query A JCR-SQL2 statement, or a builder whose limit was set.
 * @param options The limit and the offset, for a statement or for a builder that carries neither.
 * @returns The query result, with the nodes and the rows of Jahia's wrapper.
 * @throws A `QueryError` whose code is `UNSUPPORTED` when a builder reaches this function with no
 *   limit, and one whose code is `LIMIT_CONFLICT` when a value is set on both the query and the
 *   call.
 */
export function executeQuery(
  session: JCRSessionWrapper,
  query: Queryable,
  options: ExecuteOptions = {},
): QueryResultLike {
  return typeof query === "string"
    ? runStatement(session, query, options)
    : runBuilder(session, query, options);
}
