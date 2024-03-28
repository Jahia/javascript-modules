import React from 'react';
import InBrowser from './internal/InBrowser';

/**
 * Will render the given React component server side and hydrate it in the browser to make it dynamic.
 * Be careful, the component will not have access to the '@jahia/js-server-core' library from the browser.
 *
 * @param {Object} child The React component.
 * @param {Object} [props] The React component props, this props will be serialized/deserialized to be usable server and client side. The serialization and deserialization is done using JSON.stringify server side and JSON.parse in the browser. Please make sure that the props are serializable.
 */
export function HydrateInBrowser({child: Child, props}) {
    return (
        <InBrowser child={Child} props={props} dataKey="data-reacthydrate"/>
    );
}
