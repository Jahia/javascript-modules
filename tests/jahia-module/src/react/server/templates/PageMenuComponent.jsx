import React from 'react';
import {defineJahiaComponent, useServerContext} from '@jahia/js-server-core';

export const PageMenuComponent = () => {
    const {currentResource} = useServerContext();
    return currentResource.getNode().getPath();
}

PageMenuComponent.jahiaComponent = defineJahiaComponent({
    nodeType: 'jnt:page',
    name: 'menuComponent',
    componentType: 'view',
    properties: {
        'type': 'menuItem'
    }
});
