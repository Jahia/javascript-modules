import React from 'react';
import {useServerContext, defineJahiaComponent} from '@jahia/js-server-core';

export const TestRenderSub = () => {
    const {currentResource} = useServerContext();
    return (
        <div>
            Sub view {currentResource.getNode().getName()} <br/>
            prop1={currentResource.getNode().getPropertyAsString('prop1')}
        </div>
    )
}

TestRenderSub.jahiaComponent = defineJahiaComponent({
    nodeType: 'npmExample:testRender',
    name: 'sub',
    displayName: 'test Render (sub react)',
    componentType: 'view'
});
