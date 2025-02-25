import React from 'react';
import {useServerContext, getNodeProps, defineJahiaComponent} from '@jahia/javascript-modules-library';

export const SimpleContentDefault = () => {
    const {currentNode} = useServerContext();
    const simpleContent = getNodeProps(currentNode, ['title']);
    return (
        <div>
            <h2>{simpleContent.title}</h2>
        </div>
    );
};

SimpleContentDefault.jahiaComponent = defineJahiaComponent({
    name: 'default',
    nodeType: '$$MODULE_NAMESPACE$$:simpleContent',
    displayName: 'Simple Content (default)',
    componentType: 'view'
});
