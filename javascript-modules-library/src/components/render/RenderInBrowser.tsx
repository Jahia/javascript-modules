import { Island } from "./Island.js";

/**
 * Will render the given React component in the browser. Be careful, the component will not have
 * access to the '@jahia/javascript-modules-library' library from the browser.
 *
 * @deprecated Use `<Island clientOnly />` instead.
 * @returns The component to be rendered in the browser
 */
export function RenderInBrowser<T>(
  props: Readonly<{
    /** The React component */
    child: React.ComponentType<T>;
    /**
     * The React component props, these props will be serialized/deserialized to be usable server
     * and client side. The serialization is done using
     * [devalue](https://www.npmjs.com/package/devalue) allowing most standard JS types, including
     * `Set` and `Map`.
     */
    props: T & React.JSX.IntrinsicAttributes;
    children?: React.ReactNode;
  }>,
): React.JSX.Element;

/** @deprecated Use `<Island clientOnly />` instead. */
export function RenderInBrowser(
  props: Readonly<{
    /** The React component */
    child: React.ComponentType;
    children?: React.ReactNode;
  }>,
): React.JSX.Element;

/** @deprecated Use `<Island clientOnly />` instead. */
export function RenderInBrowser<T>({
  child: Child,
  props,
  children,
}: Readonly<{
  child: React.ComponentType<T>;
  props?: T & React.JSX.IntrinsicAttributes;
  children?: React.ReactNode;
}>): React.JSX.Element {
  // @ts-expect-error The type of Island is too complex for TypeScript to infer correctly
  return <Island clientOnly component={Child} props={props} children={children} />;
}
