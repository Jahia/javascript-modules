const STRING = 1;
const LONG = 3;
const DOUBLE = 4;
const DATE = 5;
const BOOLEAN = 6;
const NAME = 7;
const PATH = 8;
const REFERENCE = 9;
const WEAKREFERENCE = 10;
const URI = 11;
const DECIMAL = 12;

const extractProp = (node, propName) => {
    if (node.hasProperty(propName)) {
        const property = node.getProperty(propName);
        if (property.isMultiple()) {
            const values = property.getValues();
            const result = [];
            for (const value of values) {
                result.push(extractPropValue(node.getSession(), value, property.getType()));
            }

            return result;
        }

        return extractPropValue(node.getSession(), property.getValue(), property.getType());
    }

    return undefined;
};

const extractPropValue = (session, value, type) => {
    switch (type) {
        case STRING:
        case DATE:
        case NAME:
        case PATH:
        case URI:
        case DECIMAL:
            return value.getString();
        case LONG:
            return value.getLong();
        case DOUBLE:
            return value.getDouble();
        case BOOLEAN:
            return value.getBoolean();
        case REFERENCE:
        case WEAKREFERENCE:
            try {
                return session.getNodeByIdentifier(value.getString());
            } catch (_) {
                // Ref does not exist
                return undefined;
            }

        default:
            return undefined;
    }
};

export default (node, props) => {
    let result = {};
    if (node && props && props.length > 0) {
        for (const prop of props) {
            if (node.hasProperty(prop)) {
                result[prop] = extractProp(node, prop);
            }
        }
    }

    return result;
};
