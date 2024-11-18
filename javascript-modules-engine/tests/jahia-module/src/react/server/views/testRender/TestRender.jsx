import React from 'react';
import {AddContentButtons, Render, defineJahiaComponent} from '@jahia/js-server-core';

export const TestRender = () => {
    return (
        <>
            <div data-testid="npm-view">NPM view working</div>
            <hr/>

            <h3>Components</h3>
            Render a jnt:text as JSON Node :
            <div data-testid="component-text-json-node" className="case">
                    <Render
                        content={{
                                "name": "text",
                                "nodeType": "jnt:text",
                                "properties": {
                                        "text": "JSON node rendered"
                                }
                        }}/>
            </div>
            Render a jnt:text as JSON Node with conf OPTION :
            <div data-testid="component-text-json-node-option" className="case">
                    <Render
                        advanceRenderingConfig={'OPTION'}
                        content={{
                                "name": "textOption",
                                "nodeType": "jnt:text",
                                "properties": {
                                        "text": "JSON node rendered with option config"
                                }
                        }}/>
            </div>
            Render a npmExample:test with view sub as JSON Node with conf OPTION :
            <div data-testid="component-npm-json-node-option" className="case">
                    <Render
                        advanceRenderingConfig={'OPTION'}
                        view={'sub'}
                        content={{
                                "name": "npmOption",
                                "nodeType": "npmExample:testRender",
                                "properties": {
                                        "prop1": "prop1 value it is"
                                }
                        }}/>
            </div>
            Render a simple predefined richtext component with conf INCLUDE :
            <div data-testid="component-npm-node-include" className="case">
                    <Render
                        advanceRenderingConfig={'INCLUDE'}
                        view={'sub'}/>
            </div>
            Render a text child node :
            <div data-testid="component-text-child-node" className="case">
                    <Render path={'simpletext'}/>
                    <AddContentButtons childName={'simpletext'} nodeTypes={'jnt:text'}/>
            </div>
            Render a JSON Node with mixins :
            <div data-testid="component-json-node-with-mixin" className="case">
                    <Render
                        view={'tagged'}
                        content={{
                                "name": "viewWithMixin",
                                "nodeType": "npmExample:testRender",
                                "mixins": ["jmix:tagged"],
                                "properties": {
                                        "j:tagList": ["tag1", "tag2"]
                                }
                        }}/>
            </div>
            Render a JSON Node with parameters :
            <div data-testid="component-json-node-with-parameters" className="case">
                    <Render
                        view={'parameters'}
                        content={{
                                "name": "viewWithParameters",
                                "nodeType": "npmExample:testRender",
                                "properties": {
                                        "prop1": "prop1 value it is"
                                }
                        }}
                        parameters={{
                                "stringParam": "stringValue",
                                "stringParam2": "stringValue2",
                                "objectParam": {
                                        "integerParam": 1,
                                        "booleanParam": true
                                }
                        }}/>
            </div>
            Render an existing content Node with parameters :
            <div data-testid="component-npm-node-with-parameters" className="case">
                    <Render
                        advanceRenderingConfig={'INCLUDE'}
                        view={'parameters'}
                        parameters={{
                                "stringParam": "stringValue",
                                "stringParam2": "stringValue2",
                                "objectParam": {
                                        "integerParam": 1,
                                        "booleanParam": true
                                }
                        }}/>
            </div>
            <hr/>
            <style jsx>{`
              .case {
                padding: 10px;
                margin: 10px;
                border: 1px solid;
              }
            `}</style>
        </>
    )
}

TestRender.jahiaComponent = defineJahiaComponent({
        nodeType: 'npmExample:testRender',
        name: 'default',
        displayName: 'test Render (parameters react)',
        componentType: 'view'
});

let css = `
html {
    line-height: 1.15;
    -ms-text-size-adjust: 100%;
    -webkit-text-size-adjust: 100%
}`
