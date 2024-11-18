import React from 'react';
import {defineJahiaComponent} from '@jahia/js-server-core';

export const TestContentTemplateView = () => {
    return (
        <>
            <h2>Just a normal view</h2>
        </>
    )
}

TestContentTemplateView.jahiaComponent = defineJahiaComponent({
    nodeType: 'npmExample:testContentTemplate',
    componentType: 'view'
});
