import React from 'react';
import {defineJahiaComponent, useServerContext} from '@jahia/js-server-core';

export const TestCrashingView = () => {
    const {currentNode} = useServerContext();
    currentNode.getProperty('not_existing_property');

    return (
        <>
            <p>This view is expected to crash</p>
        </>
    )
}

TestCrashingView.jahiaComponent = defineJahiaComponent({
    nodeType: 'npmExample:testCrashingView',
    name: 'default',
    displayName: 'test crashing view',
    componentType: 'view'
});
