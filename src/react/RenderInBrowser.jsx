import React from 'react';
import {useServerContext} from './useServerContext';
import JAddResources from './AddResources';
import {buildUrl} from '../urlBuilder';

/**
 * Will render the given React component in the browser.
 * Be careful, the component will not have access to the '@jahia/js-server-engine' library from the browser.
 *
 * @param {Object} child The React component.
 * @param {Object} [props] The React component props, this props will be serialized/deserialized to be usable server and client side. The serialization and deserialization is done using JSON.stringify server side and JSON.parse in the browser. Please make sure that the props are serializable.
 * */
export function RenderInBrowser({child: Child, props}) {
    const {bundleKey, currentResource, renderContext} = useServerContext();

    const remote = buildUrl({value: '/modules/' + bundleKey + '/javascript/client/remote.js'}, renderContext, currentResource);
    const appShell = buildUrl({value: '/modules/npm-modules-engine/javascript/apps/reactAppShell.js'}, renderContext, currentResource);
    return (
        <>
            <div data-reactrender={encodeURIComponent(JSON.stringify({name: Child.name, bundle: bundleKey, props: props}))}/>
            {/* The paths are absolute here to avoid jAddResources to look for .js in other modules */}
            <JAddResources insert type="javascript" targetTag="body" resources={remote}/>
            <JAddResources type="javascript" targetTag="body" resources={appShell}/>
        </>
    );
}
