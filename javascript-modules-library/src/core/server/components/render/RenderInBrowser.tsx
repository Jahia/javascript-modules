import React from 'react';
import InBrowser from './internal/InBrowser';

/**
 * Will render the given React component in the browser.
 * Be careful, the component will not have access to the '@jahia/javascript-modules-library' library from the browser.
 *
 * @returns The component to be rendered in the browser
 * */
export function RenderInBrowser<T>(props: Readonly<{
    /** The React component */
    child: React.ComponentType<T>,
    /** The React component props, this props will be serialized/deserialized to be usable server and client side. The serialization and deserialization is done using JSON.stringify server side and JSON.parse in the browser. Please make sure that the props are serializable. */
    props: T & React.JSX.IntrinsicAttributes
}>): React.JSX.Element;

export function RenderInBrowser(props: Readonly<{
    /** The React component */
    child: React.ComponentType
}>): React.JSX.Element;

export function RenderInBrowser<T>({child: Child, props}: Readonly<{
    child: React.ComponentType<T>,
    props?: T & React.JSX.IntrinsicAttributes
}>): React.JSX.Element {
    return (
        <InBrowser preRender={false} child={Child} props={props as never} dataKey="data-reactrender"/>
    );
}
