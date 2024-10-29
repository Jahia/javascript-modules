/**
 * Returns an array of child nodes of a given node.
 * @param {import("org.jahia.services.content").JCRNodeWrapper} node - The node to get the child nodes from.
 * @param {number} limit the maximum number of nodes to return (-1 to return all nodes, but be careful with this as it can be very slow and memory consuming, it's better to use a reasonable limit and use pagination if needed)
 * @param {number} [offset=0] the offset to start from
 * @param {function} [filter] - A function to filter the nodes to be returned.
 * @returns {import("org.jahia.services.content").JCRNodeWrapper[]} An array of child nodes.
 */
export function getChildNodes(node, limit, offset = 0, filter = undefined) {
    let result = [];

    if (!node || !limit) {
        console.warn('Missing one or more mandatory parameters (node, limit) to getChildNodes');
        return result;
    }

    const iterator = node.getNodes();
    let skipped = 0; // Track how many nodes have been skipped
    while (iterator.hasNext()) {
        const child = iterator.nextNode();

        // Skip nodes until reaching the offset
        if (skipped < offset) {
            if (!filter || filter(child)) {
                skipped++;
            }

            continue;
        }

        if (!filter || filter(child)) {
            result.push(child);
            if (limit > 0 && result.length === limit) {
                break;
            }
        }
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return result;
}
