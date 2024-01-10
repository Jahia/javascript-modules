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
