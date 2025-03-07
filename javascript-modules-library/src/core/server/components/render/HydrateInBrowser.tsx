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
     * and client side. The serialization is done using
     * [devalue](https://www.npmjs.com/package/devalue) allowing most standard JS types, including
     * `Set` and `Map`.
     */
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
  children,
}: Readonly<{
  child: React.ComponentType<T>;
  props?: T & React.JSX.IntrinsicAttributes;
  children?: React.ReactNode;
}>): React.JSX.Element {
  return (
    <InBrowser ssr child={Child} props={props as never}>
      {children}
    </InBrowser>
  );
}
