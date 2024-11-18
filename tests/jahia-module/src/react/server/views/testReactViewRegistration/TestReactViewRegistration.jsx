import React from 'react';
import {server, defineJahiaComponent} from '@jahia/js-server-core';

export const TestReactViewRegistration = () => {
    const testAreasName = server.registry.get('view', 'jahia-npm-module-example_view_npmExample:testAreas_default').name;
    const testRegistryName = server.registry.get('view', '@@@customid//for-testing@@@_view_npmExample:testReactViewRegistration_default').name;
    // We test non existant entries to make sure that the ProxyObject is not created by the RegistryHelper in this case
    const nonExistantComponent = server.registry.get('view', '@@@thisobjectdoesnotexist@@@');
    return (
        <>
            <div data-testid="standardViewRegistration">
                npmExample:testAreas view component name=[{testAreasName}]
            </div>
            <div data-testid="customViewRegistration">
                npmExample:testReactViewRegistration view component name=[{testRegistryName}]
            </div>
            <div data-testid="noRegistration">
                Non existing component=[{nonExistantComponent || 'null'}]
            </div>
        </>
    )
}

TestReactViewRegistration.jahiaComponent = defineJahiaComponent({
    // we provide an id here to make sure the registration also works properly for this case, by it is not mandatory
    id: '@@@customid//for-testing@@@_view_npmExample:testReactViewRegistration_default',
    nodeType: 'npmExample:testReactViewRegistration',
    displayName: 'Test React registration',
    componentType: 'view'
});
