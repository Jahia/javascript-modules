import React from 'react';
import {defineJahiaComponent} from "@jahia/javascript-modules-library";

export const TestContentTemplateOtherView = () => {
    return (
        <>
            <h2>Just an other normal view</h2>
        </>
    )
}

TestContentTemplateOtherView.jahiaComponent = defineJahiaComponent({
    nodeType: 'npmExample:testContentTemplate',
    componentType: 'view',
    name: 'other'
});
