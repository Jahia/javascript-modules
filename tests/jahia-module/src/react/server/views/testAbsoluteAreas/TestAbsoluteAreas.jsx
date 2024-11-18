import React from 'react';
import {AbsoluteArea, defineJahiaComponent} from '@jahia/js-server-core';

export const TestAbsoluteAreas = () => {
    return (
        <>
            <h2>React JAbsoluteArea test component</h2>

            <h2>Basic Area</h2>
            <div data-testid="basicArea">
                <AbsoluteArea name={"basicArea"} level={1}/>
            </div>

            <h2>Area with allowed types</h2>
            <div data-testid="allowedTypesArea">
                <AbsoluteArea name={"allowedTypesArea"} allowedTypes={["jnt:event", "jnt:bigText"]} level={1}/>
            </div>

            <h2>Area with number of items</h2>
            <div data-testid="numberOfItemsArea">
                <AbsoluteArea name={"numberOfItemsArea"} numberOfItems={2} level={1}/>
            </div>

            <h2>Area with areaView</h2>
            <div data-testid="areaViewArea">
                <AbsoluteArea name={"areaViewArea"} areaView={"dropdown"} level={1}/>
            </div>

            <h2>Area with subNodesView</h2>
            <div data-testid="subNodesViewArea">
                <AbsoluteArea name={"subNodesViewArea"} subNodesView={"link"} level={1}/>
            </div>

            <h2>Area with path</h2>
            <div data-testid="pathArea">
                <AbsoluteArea path={"basicArea/subLevel"} level={1}/>
            </div>

            <h2>Absolute Area with home page content</h2>
            <div data-testid="absoluteArea">
                <AbsoluteArea name="pagecontent"/>
            </div>

            <h2>Non editable area </h2>
            <div data-testid="nonEditableArea">
                <AbsoluteArea name="nonEditable" editable={false} level={1}/>
            </div>

            <h2>Absolute area level </h2>
            <div data-testid="absoluteAreaLevel">
                <AbsoluteArea name="pagecontent" level={0}/>
            </div>

            <h2>Area type</h2>
            <div data-testid="areaType">
                <AbsoluteArea name="areaType" areaType="npmExample:testAreaColumns" level={1}/>
            </div>

            <h2>Limited absolute area editing</h2>
            <div data-testid="limitedAbsoluteAreaEdit">
                <AbsoluteArea name="pagecontent" limitedAbsoluteAreaEdit={false}/>
            </div>

            <h2>Absolute Area parameters</h2>
            <div data-testid="absoluteAreaParameters">
                <AbsoluteArea name="absoluteAreaParameters" areaView="parameters"
                              parameters={{"stringParam1": "stringValue1", "stringParam2": "stringValue2"}} level={1}/>
            </div>

        </>
    )
}

TestAbsoluteAreas.jahiaComponent = defineJahiaComponent({
    nodeType: 'npmExample:testAbsoluteAreas',
    name: 'default',
    displayName: 'Test Absolute Areas (react)',
    componentType: 'view'
});
