import React from 'react';
import InBrowser from './internal/InBrowser';

/**
 * Will render the given React component in the browser.
 * Be careful, the component will not have access to the '@jahia/javascript-modules-library' library from the browser.
 *
 * @param {object} params The React component.
 * @param {object} params.child The React component.
 * @param {object} [params.props] The React component props, this props will be serialized/deserialized to be usable server and client side. The serialization and deserialization is done using JSON.stringify server side and JSON.parse in the browser. Please make sure that the props are serializable.
 * @returns {JSX.Element} The component to be rendered in the browser
 * */
export function RenderInBrowser({child: Child, props}) {
    return (
        <InBrowser preRender={false} child={Child} props={props} dataKey="data-reactrender"/>
    );
}