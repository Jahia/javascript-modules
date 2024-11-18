import React from 'react';
import {defineJahiaComponent, useServerContext} from '@jahia/js-server-core';

export const ContentListParameters = () => {
    const {currentResource} = useServerContext();
    return (
        <>
            <h3>Parameter view {currentResource.getNode().getName()}</h3>
            <div data-testid="areaParam-string1">
                stringParam1={currentResource.getModuleParams().get('stringParam1')}
            </div>
            <div data-testid="areaParam-string2">
                stringParam2={currentResource.getModuleParams().get('stringParam2')}
            </div>
        </>
    )
}

ContentListParameters.jahiaComponent = defineJahiaComponent({
    nodeType: 'jnt:contentList',
    name: 'parameters',
    displayName: 'Test Area with parameters',
    componentType: 'view'
});
