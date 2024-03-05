import React from 'react';
import {useServerContext} from './ServerContext';
import JAddResources from './JAddResources';

/**
 * Will render the given React component server side and hydrate it in the browser to make it dynamic.
 * Be careful, the component will not have access to the '@jahia/js-server-engine' library from the browser.
 *
 * @param {Object} child The React component.
 * @param {Object} [props] The React component props, this props will be serialized/deserialized to be usable server and client side. The serialization and deserialization is done using JSON.stringify server side and JSON.parse in the browser. Please make sure that the props are serializable.
 */
const HydrateInBrowser = ({child: Child, props}) => {
    const {bundleKey} = useServerContext();

    return (
        <>
            <div data-reacthydrate={encodeURIComponent(JSON.stringify({name: Child.name, bundle: bundleKey, props: props || {}}))}>
                <Child {...props}/>
            </div>
            {/* The paths are absolute here to avoid jAddResources to look for .js in other modules */}
            <JAddResources insert
                           type="javascript"
                           targetTag="body"
                           resources={'/modules/' + bundleKey + '/javascript/client/remote.js'}/>
            <JAddResources type="javascript"
                           targetTag="body"
                           resources="/modules/npm-modules-engine/javascript/apps/reactAppShell.js"/>
        </>
    );
};

export default HydrateInBrowser;
