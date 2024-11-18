import React from 'react';
import {Area, defineJahiaComponent, useServerContext} from '@jahia/js-server-core';

export const TestAreaColumns = () => {
    const {currentNode} = useServerContext();
    return (
        <div data-testid={`row-${currentNode.getName()}`}>
            <div data-testid={`${currentNode.getName()}-col-1`}>
                <Area name={`${currentNode.getName()}-col-1`} areaAsSubNode={true}/>
            </div>
            <div data-testid={`${currentNode.getName()}-col-2`}>
                <Area name={`${currentNode.getName()}-col-2`} areaAsSubNode={true}/>
            </div>
        </div>
    );
};

TestAreaColumns.jahiaComponent = defineJahiaComponent({
    nodeType: 'npmExample:testAreaColumns',
    name: 'default',
    componentType: 'view'
});
