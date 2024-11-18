import React from 'react';
import {buildNavMenu, defineJahiaComponent, useServerContext} from '@jahia/js-server-core';

export const PageNavMenu = () => {
    const {renderContext, currentResource} = useServerContext();
    const baseNode = renderContext.getRequest().getParameter('baseline');
    const maxDepth = renderContext.getRequest().getParameter('maxDepth') ? parseInt(renderContext.getRequest().getParameter('maxDepth'), 10) : 10;
    const startLevel = renderContext.getRequest().getParameter('startLevel') ? parseInt(renderContext.getRequest().getParameter('startLevel'), 10) : 0;
    return (
        <div dangerouslySetInnerHTML={{
            __html: JSON.stringify(buildNavMenu(maxDepth, baseNode, 'menuComponent', startLevel, renderContext, currentResource))
        }}/>
    )
}

PageNavMenu.jahiaComponent = defineJahiaComponent({
    nodeType: 'jnt:page',
    name: 'navMenu',
    displayName: 'Nav Menu',
    componentType: 'template'
});
