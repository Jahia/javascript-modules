import React from 'react';
import {defineJahiaComponent} from "@jahia/js-server-core";

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
