/**
 * Execute a JCR SQL2 query and return the result as an array of nodes
 * @param {import("org.jahia.services.content").JCRSessionWrapper} session the JCR session to use
 * @param {string} query the JCR SQL2 query to execute
 * @param {number} limit the maximum number of nodes to return (-1 to return all nodes, but be careful with this as it can be very slow and memory consuming, it's better to use a reasonable limit and use pagination if needed)
 * @param {number} [offset=0] the offset to start from
 * @returns {import('org.jahia.services.content').JCRNodeWrapper[]} an array containing the nodes returned by the query
 */
export function getNodesByJCRQuery(session, query, limit, offset = 0) {
    let result = [];

    if (!session || !query || !limit) {
        console.warn('Missing one or more mandatory parameters (session, query, limit) to getNodesByJCRQuery');
        return result;
    }

    const sql2Query = session.getWorkspace().getQueryManager().createQuery(query, 'JCR-SQL2');
    if (limit > 0) {
        sql2Query.setLimit(limit);
    }

    if (offset && offset > 0) {
        sql2Query.setOffset(offset);
    }

    const iterator = sql2Query.execute().getNodes();
    while (iterator.hasNext()) {
        result.push(iterator.nextNode());
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return result;
}
