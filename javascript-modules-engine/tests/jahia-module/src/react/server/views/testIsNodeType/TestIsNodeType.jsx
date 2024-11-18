import React from 'react';
import {defineJahiaComponent, useServerContext} from '@jahia/js-server-core';

export const TestIsNodeType = () => {
    const {currentNode} = useServerContext();
    return (
        <>
            <h3>Current node type is testIsNodeType</h3>
            <div data-testid="currentNode_isNodeType">{currentNode.isNodeType('npmExample:testIsNodeType') ? 'true' : 'false'}</div>

            <h3>Current node type is not jnt:page</h3>
            <div data-testid="currentNode_isNotNodeType">{currentNode.isNodeType('jnt:page') ? 'true' : 'false'}</div>
        </>
    );
}

TestIsNodeType.jahiaComponent = defineJahiaComponent({
    nodeType: 'npmExample:testIsNodeType',
    name: 'default',
    displayName: 'test is node type',
    componentType: 'view'
});
