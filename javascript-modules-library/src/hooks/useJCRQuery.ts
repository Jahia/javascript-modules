import { useServerContext } from "./useServerContext.js";
import { getNodesByJCRQuery } from "../utils/jcr/getNodesByJCRQuery.js";
import type { Executable, Queryable } from "../query/builder.js";
import { QueryError } from "../query/validate.js";
import type { JCRNodeWrapper } from "org.jahia.services.content";

/**
 * Execute a JCR query
 *
 * @deprecated A query without a limit returns every node it matches, which is slow and memory
 *   consuming on a large repository. This form now throws a `QueryError` whose code is
 *   `UNSUPPORTED`. Pass a `limit`, pass `-1` when you really want every matching node, or pass a
 *   query built with `from()`, which carries its own limit.
 * @param options The query to execute
 * @returns The result of the query
 * @throws A `QueryError` whose code is `UNSUPPORTED`, because this form carries no limit.
 */
export function useJCRQuery(options: {
  /** The JCR SQL2 query to execute. */
  query: string;
}): JCRNodeWrapper[];

/**
 * Execute a JCR query
 *
 * @param options The query to execute, with its limit and its offset
 * @returns The result of the query
 */
export function useJCRQuery(options: {
  /** The JCR SQL2 query to execute. */
  query: string;
  /** The maximum number of nodes to return, where -1 returns every matching node. */
  limit: number;
  /** The offset to start from. */
  offset?: number;
}): JCRNodeWrapper[];

/**
 * Execute a query built with `from()`
 *
 * The query carries its own limit, offset and bind values, so this form takes neither a `limit` nor
 * an `offset`.
 *
 * @param options The built query to execute
 * @returns The result of the query
 */
export function useJCRQuery(options: {
  /** The built query to execute, whose limit was set. */
  query: Executable;
}): JCRNodeWrapper[];

export function useJCRQuery({
  query,
  limit,
  offset,
}: {
  query: Queryable;
  limit?: number;
  offset?: number;
}): JCRNodeWrapper[] {
  // The deprecated form carried no limit and ran unbounded. It now asks for the decision instead of
  // taking it, so that the limit rule holds on the statement path as well. `-1` stays the way to
  // ask for every matching node, and it is now written at the call site. The check runs before the
  // session is read, so nothing happens before the refusal.
  if (typeof query === "string" && limit === undefined) {
    throw new QueryError(
      "UNSUPPORTED",
      "useJCRQuery was called with a statement and no limit, so it would return every node the statement matches. Pass a limit, pass -1 when you really want every matching node, or pass a query built with from()",
      "execution.limit",
    );
  }

  // The session comes from the node being rendered, which is the spelling the guide and the test
  // module use. The engine builds the server context's `jcrSession` from the same call, so this is
  // the session of the current user in the current language. The main resource was the earlier
  // source here, and that is the page root rather than the node being rendered.
  const { currentNode } = useServerContext();
  const session = currentNode.getSession();

  if (typeof query === "string") {
    return getNodesByJCRQuery(session, query, limit, offset ?? 0);
  }

  // A JavaScript caller can still pass a limit or an offset next to a built query, which
  // `getNodesByJCRQuery` reports as `LIMIT_CONFLICT`. The caller's `undefined` is passed on
  // unchanged, so it stays the one sentinel for "nothing was passed".
  return getNodesByJCRQuery(session, query, limit, offset);
}
