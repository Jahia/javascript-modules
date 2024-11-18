import React from 'react';
import {Area, defineJahiaComponent} from '@jahia/js-server-core';

export const TestAreas = () => {
    return (
        <>
            <h2>React JArea test component</h2>

            <h2>Basic Area</h2>
            <div data-testid="basicArea">
                <Area name={"basicArea"}/>
            </div>

            <h2>Area with allowed types</h2>
            <div data-testid="allowedTypesArea">
                <Area name={"allowedTypesArea"} allowedTypes={["jnt:event", "jnt:bigText"]}/>
            </div>

            <h2>Area with number of items</h2>
            <div data-testid="numberOfItemsArea">
                <Area name={"numberOfItemsArea"} numberOfItems={2}/>
            </div>

            <h2>Area with areaView</h2>
            <div data-testid="areaViewArea">
                <Area name={"areaViewArea"} areaView={"dropdown"}/>
            </div>

            <h2>Area with subNodesView</h2>
            <div data-testid="subNodesViewArea">
                <Area name={"subNodesViewArea"} subNodesView={"link"}/>
            </div>

            <h2>Area with path</h2>
            <div data-testid="pathArea">
                <Area path={"basicArea/subLevel"}/>
            </div>

            <h2>Non editable area </h2>
            <div data-testid="nonEditableArea">
                <Area name="nonEditable" editable="false"/>
            </div>

            <h2>Area as sub node </h2>
            <div data-testid="areaAsSubNode">
                <Area name="areaAsSubNode" areaAsSubNode={true}/>
            </div>

            <h2>Area type</h2>
            <div data-testid="areaType">
                <Area name="areaType" areaType="npmExample:testAreaColumns"/>
            </div>

            <h2>Area parameters</h2>
            <div data-testid="areaParameters">
                <Area name="areaParameters" areaView="parameters" parameters={{ "stringParam1": "stringValue1", "stringParam2": "stringValue2"}} />
            </div>

        </>
    )
}

TestAreas.jahiaComponent = defineJahiaComponent({
    nodeType: 'npmExample:testAreas',
    name: 'default',
    displayName: 'test Areas (react)',
    componentType: 'view'
});
