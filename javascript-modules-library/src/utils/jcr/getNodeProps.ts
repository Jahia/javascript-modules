import type { JCRNodeWrapper, JCRValueWrapper } from "org.jahia.services.content";

/** All possible JCR value unwrappers, by type. */
const unwrappers = [
  null, // 0: Undefined
  (value: JCRValueWrapper) => value.getString(), // 1: String
  null, // 2: Binary, deprecated
  (value: JCRValueWrapper) => value.getLong(), // 3: Long
  (value: JCRValueWrapper) => value.getDouble(), // 4: Double
  (value: JCRValueWrapper) => value.getString(), // 5: Date. Use string as Date only supports the current system timezone
  (value: JCRValueWrapper) => value.getBoolean(), // 6: Boolean
  (value: JCRValueWrapper) => value.getString(), // 7: Name
  (value: JCRValueWrapper) => value.getString(), // 8: Path
  (value: JCRValueWrapper) => value.getNode(), // 9: Reference
  (value: JCRValueWrapper) => value.getNode(), // 10: WeakReference
  (value: JCRValueWrapper) => value.getString(), // 11: URI
  (value: JCRValueWrapper) => value.getString(), // 12: Decimal
];

/**
 * The props of the component.
 *
 * We use a `Proxy` to automatically retrieve the props from the JCR layer, and properly unwrap
 * them.
 */
const createPropsProxy = (node: JCRNodeWrapper) =>
  new Proxy({} as never, {
    get: (_, key) => {
      if (typeof key !== "string") {
        throw new Error("Invalid prop type");
      }

      const id = node.getIdentifier();
      if (!node.hasProperty(key)) {
        return undefined;
      }

      const property = node.getProperty(key);
      const unwrapper = unwrappers[property.getType()];
      if (!unwrapper) {
        throw new Error(`Unknown JCR property type ${property.getType()} (${key} of node ${id})`);
      }

      try {
        return property.isMultiple()
          ? property.getValues().map((value) => unwrapper(value))
          : unwrapper(property.getValue());
      } catch (error) {
        console.debug(`Could not retrieve ${key} of node ${id}:`, error);
        return undefined;
      }
    },
    ownKeys: () => {
      const propertiesIterator = node.getProperties();
      const keys = [];
      while (propertiesIterator.hasNext()) {
        const property = propertiesIterator.nextProperty();
        keys.push(property.getName());
      }
      return keys;
    },
    getOwnPropertyDescriptor: () => {
      return { enumerable: true, configurable: true };
    },
    has: (_, key) => {
      if (typeof key !== "string") {
        return false;
      }
      return node.hasProperty(key);
    },
  });

/**
 * Extracts the properties from a node
 *
 * @param node The node on which to extract the properties
 * @param props The name of the properties to extract
 * @returns An object containing the property values.
 *
 *   If props is an array (even empty), only the specified properties will be returned. If props is
 *   undefined, all properties will be returned through a Proxy object.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getNodeProps<T = Record<string, any>>(node: JCRNodeWrapper, props?: string[]): T {
  const proxy = createPropsProxy(node);

  if (props === undefined) {
    return proxy;
  }

  // If props is an array, return only the specified properties as an object
  return Object.fromEntries(props.map((prop) => [prop, proxy[prop]])) as T;
}
