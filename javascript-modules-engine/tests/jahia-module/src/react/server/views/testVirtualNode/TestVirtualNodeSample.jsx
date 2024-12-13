import React from 'react';
import {defineJahiaComponent, getNodeProps, useServerContext} from '@jahia/javascript-modules-library';

export const TestVirtualNodeSample = () => {
    const {currentNode} = useServerContext();
    const props = getNodeProps(currentNode, ['myProperty']);

    return (
        <div data-testid="testVirtualNodeSample_myProperty">{props['myProperty']}</div>
    );
};

TestVirtualNodeSample.jahiaComponent = defineJahiaComponent({
    nodeType: 'npmExample:testVirtualNodeSample',
    componentType: 'view',
});