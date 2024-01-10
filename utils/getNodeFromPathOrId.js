export default (props, session) => {
    if (props.identifier) {
        return session.getNodeByIdentifier(props.identifier);
    }

    if (props.path) {
        return session.getNode(props.path);
    }

    return null;
};
