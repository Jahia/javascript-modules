import React from 'react';
import {defineJahiaComponent, server, useServerContext} from '@jahia/js-server-core';

export const TestFindDisplayableContent = () => {
    const {currentResource, renderContext} = useServerContext();

    let displayableNodePath = '';
    const targetNodeRef = currentResource.getNode().hasProperty('target') ?
        currentResource.getNode().getProperty('target').getValue().getNode() :
        undefined;
    if (targetNodeRef) {
        const displayableNode = server.render.findDisplayableNode(targetNodeRef, renderContext, null);
        if (displayableNode) {
            displayableNodePath = displayableNode.getPath();
        }
    }
    return (
        <>
            <h2>Test findDisplayableNode helper</h2>

            <p data-testid="displayableContent">
                Found displayable content: {displayableNodePath}
            </p>
        </>
    )
}

TestFindDisplayableContent.jahiaComponent = defineJahiaComponent({
    nodeType: 'npmExample:testFindDisplayableContent',
    name: 'default',
    displayName: 'test jFindDisplayableContent',
    componentType: 'view'
});
