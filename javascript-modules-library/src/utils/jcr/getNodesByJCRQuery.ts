import type { Node } from "javax.jcr";
import type { JCRNodeWrapper, JCRSessionWrapper } from "org.jahia.services.content";

/**
 * Execute a JCR SQL2 query and return the result as an array of nodes
 *
 * @param session The JCR session to use
 * @param query The JCR SQL2 query to execute
 * @param limit The maximum number of nodes to return (-1 to return all nodes, but be careful with
 *   this as it can be very slow and memory consuming, it's better to use a reasonable limit and use
 *   pagination if needed)
 * @param offset The offset to start from
 * @returns An array containing the nodes returned by the query
 */
export function getNodesByJCRQuery(
  session: JCRSessionWrapper,
  query: string,
  limit: number | undefined = undefined,
  offset = 0,
): JCRNodeWrapper[] {
  const result: JCRNodeWrapper[] = [];

  if (!session || !query || !limit) {
    console.warn(
      "Missing one or more mandatory parameters (session, query, limit) to getNodesByJCRQuery",
    );
    return result;
  }

  const sql2Query = session.getWorkspace().getQueryManager().createQuery(query, "JCR-SQL2");
  if (limit > 0) {
    sql2Query.setLimit(limit);
  }

  if (offset && offset > 0) {
    sql2Query.setOffset(offset);
  }

  const iterator = sql2Query.execute().getNodes();
  while (iterator.hasNext()) {
    result.push(iterator.nextNode() as JCRNodeWrapper);
  }

  return result;
}
