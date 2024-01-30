import React from 'react';
import {JRender, getNodeProps, useServerContext, getChildNodes} from '@jahia/js-server-engine';

export const TestJRenderEditable = () => {
    const {currentNode} = useServerContext();
    const allChildren = getChildNodes(currentNode);
    return (
        <>
            <div data-testid="npm-render-editable-default">
                <h3>NPM JRender generates editable items by default</h3>
                <div class="childs">
                    {allChildren && allChildren.map(function(child, i){
                        return <JRender path={child.getPath()} key={child.getIdentifier()} />;
                    })}
                </div>
            </div>
            <div data-testid="npm-render-editable">
                <h3>NPM JRender generates editable items when precised true</h3>
                <div class="childs">
                    {allChildren && allChildren.map(function(child, i){
                        return <JRender path={child.getPath()}  editable={true} key={child.getIdentifier()} />;
                    })}
                </div>
            </div>
            <div data-testid="npm-render-not-editable">
                <h3>NPM JRender generates non editable items when precised false</h3>
                <div class="childs">
                    {allChildren && allChildren.map(function(child, i){
                        return <JRender path={child.getPath()} editable={false} key={child.getIdentifier()} />;
                    })}
                </div>
            </div>
        </>
    )
}

TestJRenderEditable.jahiaComponent = {
    id: 'testJRenderEditable',
    nodeType: 'npmExample:testRenderEditable',
    displayName: 'Test JRender Editable',
    componentType: 'view'
}

export const SimpleText = () => {
    const {currentNode} = useServerContext();
    const props = getNodeProps(currentNode, ['text']);
    return (
        <div className="simple-text">
            {props.text}
        </div>
    )
}

SimpleText.jahiaComponent = {
    id: 'simpleText',
    nodeType: 'npmExample:simpleText',
    displayName: 'Simple Text',
    componentType: 'view'
}
