import { useServerContext } from "./useServerContext.js";
import { getNodesByJCRQuery } from "../utils/jcr/getNodesByJCRQuery.js";
import type { Executable, Queryable } from "../query/builder.js";
import type { JCRNodeWrapper } from "org.jahia.services.content";

/**
 * Execute a JCR query
 *
 * @deprecated A query without a limit returns every node it matches, which is slow and memory
 *   consuming on a large repository. Pass a `limit`, or pass a query built with `from()`, which
 *   carries its own limit.
 * @param options The query to execute
 * @returns The result of the query
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
  const { renderContext } = useServerContext();
  const session = renderContext.getMainResource().getNode().getSession();

  if (typeof query === "string") {
    // The deprecated form has no limit, and -1 is the value it has always used.
    return getNodesByJCRQuery(session, query, limit ?? -1, offset ?? 0);
  }

  // A JavaScript caller can still pass a limit or an offset next to a built query, which
  // `getNodesByJCRQuery` reports as `LIMIT_CONFLICT`. The caller's `undefined` is passed on
  // unchanged, so it stays the one sentinel for "nothing was passed".
  return getNodesByJCRQuery(session, query, limit, offset);
}
