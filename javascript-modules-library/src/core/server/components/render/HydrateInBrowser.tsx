import InBrowser from "./internal/InBrowser.js";

/**
 * Will render the given React component server side and hydrate it in the browser to make it
 * dynamic. Be careful, the component will not have access to the
 * '@jahia/javascript-modules-library' library from the browser.
 *
 * @returns The component to be hydrated in the browser
 */
// Generic declaration
export function HydrateInBrowser<T>(
  props: Readonly<{
    /** The React component. */
    child: React.ComponentType<T>;
    /**
     * The React component props, these props will be serialized/deserialized to be usable server
     * and client side. The serialization and deserialization is done using JSON.stringify server
     * side and JSON.parse in the browser. Please make sure that the props are serializable.
     */
    // TODO: Consider "devalue" to allow serialization of a wider range of objects
    props: T & React.JSX.IntrinsicAttributes;
  }>,
): React.JSX.Element;

// Without props declaration
export function HydrateInBrowser(
  props: Readonly<{
    /** The React component. */
    child: React.ComponentType;
  }>,
): React.JSX.Element;

// Implementation
export function HydrateInBrowser<T>({
  child: Child,
  props,
}: Readonly<{
  child: React.ComponentType<T>;
  props?: T & React.JSX.IntrinsicAttributes;
}>): React.JSX.Element {
  return <InBrowser ssr child={Child} props={props as never} />;
}
