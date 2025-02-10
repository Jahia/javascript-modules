import type {JCRNodeWrapper, JCRSessionWrapper, JCRValueWrapper} from 'org.jahia.services.content';

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

const extractProp = (node: JCRNodeWrapper, propName: string) => {
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

const extractPropValue = (session: JCRSessionWrapper, value: JCRValueWrapper, type: number) => {
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

/**
 * Extracts the properties from a node
 * @param node the node on which to extract the properties
 * @param props the name of the properties to extract
 * @returns an object containing the property values
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getNodeProps(node: JCRNodeWrapper, props: string[]): Record<string, any> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: Record<string, any> = {};
    if (node && props && props.length > 0) {
        for (const prop of props) {
            if (node.hasProperty(prop)) {
                result[prop] = extractProp(node, prop);
            }
        }
    }

    return result;
}
