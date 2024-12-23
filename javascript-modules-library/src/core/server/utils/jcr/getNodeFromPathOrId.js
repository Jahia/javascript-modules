/**
 * Returns a node from a path or identifier
 * @param {object} props - The properties object containing either the node identifier or the node path.
 * @param {string} [props.identifier] - The node identifier.
 * @param {string} [props.path] - The node path.
 * @param {import("org.jahia.services.content").JCRSessionWrapper} session - The JCR session.
 * @returns {import("org.jahia.services.content").JCRNodeWrapper} The node.
 */
export function getNodeFromPathOrId(props, session) {
    if (props.identifier) {
        return session.getNodeByIdentifier(props.identifier);
    }

    if (props.path) {
        return session.getNode(props.path);
    }

    return null;
}
