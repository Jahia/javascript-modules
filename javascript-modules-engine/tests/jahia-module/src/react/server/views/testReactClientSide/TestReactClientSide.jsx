import React from 'react';
import {defineJahiaComponent, HydrateInBrowser, RenderInBrowser, useServerContext} from '@jahia/js-server-core';
import SampleHydrateInBrowserReact from "../../../../client/SampleHydrateInBrowserReact";
import SampleRenderInBrowserReact from "../../../../client/SampleRenderInBrowserReact";

export const TestReactClientSide = () => {
    const {currentResource} = useServerContext();

    return (
        <>
            <h2>Just a normal view, that is using a client side react component: </h2>
            <HydrateInBrowser child={SampleHydrateInBrowserReact} props={{initialValue: 9}}/>
            <RenderInBrowser child={SampleRenderInBrowserReact} props={{path: currentResource.getNode().getPath()}}/>
        </>
    )
}

TestReactClientSide.jahiaComponent = defineJahiaComponent({
    id: 'test_react_react_client_side',
    nodeType: 'npmExample:testReactClientSide',
    componentType: 'view'
});
