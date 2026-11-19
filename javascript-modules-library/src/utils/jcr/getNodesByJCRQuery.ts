import type { JCRNodeWrapper, JCRSessionWrapper } from "org.jahia.services.content";
import type { Queryable } from "../../query/builder.js";
import { executeQuery } from "../../query/execute.js";
import type { QueryResultLike } from "../../query/execute.js";

function collect(result: QueryResultLike): JCRNodeWrapper[] {
  const nodes: JCRNodeWrapper[] = [];
  const iterator = result.getNodes();
  while (iterator.hasNext()) {
    nodes.push(iterator.nextNode() as JCRNodeWrapper);
  }

  return nodes;
}

/**
 * Execute a JCR query and return the result as an array of nodes
 *
 * The query is either a JCR SQL2 statement or a query built with `from()`. A built query carries
 * its own limit, offset and bind values, so the `limit` and `offset` parameters must be left out
 * for one: passing a value here that the query already carries throws a `QueryError` whose code is
 * `LIMIT_CONFLICT`, because only one of the two values could win.
 *
 * @param session The JCR session to use
 * @param query The JCR SQL2 query to execute, or a built query whose limit was set
 * @param limit The maximum number of nodes to return, for a JCR SQL2 statement only (-1 to return
 *   all nodes, but be careful with this as it can be very slow and memory consuming, it's better to
 *   use a reasonable limit and use pagination if needed)
 * @param offset The offset to start from, for a JCR SQL2 statement only
 * @returns An array containing the nodes returned by the query
 */
export function getNodesByJCRQuery(
  session: JCRSessionWrapper,
  query: Queryable,
  limit: number | undefined = undefined,
  offset: number | undefined = undefined,
): JCRNodeWrapper[] {
  if (typeof query === "string") {
    if (!session || !query || !limit) {
      console.warn(
        "Missing one or more mandatory parameters (session, query, limit) to getNodesByJCRQuery",
      );
      return [];
    }

    return collect(executeQuery(session, query, { limit, offset }));
  }

  if (!session || !query) {
    console.warn("Missing one or more mandatory parameters (session, query) to getNodesByJCRQuery");
    return [];
  }

  // `undefined` is the only sentinel for "the caller passed nothing", so any positional value next
  // to a value the query carries is a conflict, including an offset of zero.
  return collect(executeQuery(session, query, { limit, offset }));
}
