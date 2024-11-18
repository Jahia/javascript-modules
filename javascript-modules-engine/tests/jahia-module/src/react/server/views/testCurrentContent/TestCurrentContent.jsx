import React from 'react';
import {defineJahiaComponent, useServerContext} from '@jahia/js-server-core';

export const TestCurrentContent = () => {
    const {currentResource,currentNode,mainNode} = useServerContext();
    const mixins = currentNode.getMixinNodeTypes().map((e) => {return e.getName()}).join(",");
    const propMultiple = currentNode.getProperty('propMultiple').getValues().map((e) => {return e.getString()}).join(",");
    return (
        <>
            <h3>currentContent usages</h3>
            <div data-testid="currentContent_resourcePath">{currentResource.getNode().getPath()}</div>
            <div data-testid="currentContent_nodePath">{currentNode.getPath()}</div>
            <div data-testid="currentContent_mainNodePath">{mainNode.getPath()}</div>
            <div data-testid="currentContent_properties_jcr:title">jcr:title
                : {currentNode.getPropertyAsString('jcr:title')}</div>
            <div data-testid="currentContent_properties_prop1">prop1 : {currentNode.getPropertyAsString('prop1')}</div>
            <div data-testid="currentContent_properties_propMultiple">propMultiple : {propMultiple}</div>
            <div data-testid="currentContent_properties_propI18n">propI18n
                : {currentNode.getPropertyAsString('propI18n')}</div>
            <div data-testid="currentContent_properties_propRichText">
                <div>richtext :</div>
                <div dangerouslySetInnerHTML={{
                    __html: currentNode.getPropertyAsString('propRichText')
                }}/>
            </div>
            <div data-testid="currentContent_uuid">uuid : {currentNode.getIdentifier()}</div>
            <div data-testid="currentContent_name">name : {currentNode.getName()}</div>
            <div data-testid="currentContent_path">path : {currentNode.getPath()}</div>
            <div data-testid="currentContent_parent">parent : {currentNode.getParent().getPath()}</div>
            <div data-testid="currentContent_nodeType">nodeType : {currentNode.getPrimaryNodeTypeName()}</div>
            <div data-testid="currentContent_mixins">mixins : {mixins}</div>
            <hr/>
        </>
    )
}

TestCurrentContent.jahiaComponent = defineJahiaComponent({
    nodeType: 'npmExample:testCurrentContent',
    name: 'default',
    displayName: 'test currentContent',
    componentType: 'view'
});
