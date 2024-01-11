/**
 * Returns an array of child nodes of a given node.
 * @param {JCRNodeWrapper} node - The node to get the child nodes from.
 * @param {number} limit - The maximum number of nodes to return (defaults to 100).
 * @param {function} filter - A function to filter the nodes to be returned.
 * @returns {JCRNodeWrapper[]} An array of child nodes.
 */
export default (node, limit = 100, filter = undefined) => {
    let result = [];
    if (node) {
        const iterator = node.getNodes();
        while (iterator.hasNext()) {
            const child = iterator.nextNode();
            if (!filter || filter(child)) {
                result.push(child);
                if (limit > 0 && result.length === limit) {
                    break;
                }
            }
        }
    }

    return result;
};
