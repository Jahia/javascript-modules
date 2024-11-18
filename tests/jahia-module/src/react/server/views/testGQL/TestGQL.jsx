import React from 'react';
import {defineJahiaComponent, useGQLQuery, useServerContext} from "@jahia/js-server-core";

export const TestGQL = () => {
    const {currentNode} = useServerContext();
    const result = useGQLQuery({
        query: "query ($path:String!) { jcr { nodeByPath(path:$path) { name, properties { name, value } } } }",
        variables: {path: currentNode.getPath()}
    });
    return (
        <>
            <div data-testid="npm-view">NPM (react) view working</div>
            <hr/>

            <h3>GraphQL</h3>
            <div data-testid="gql-info-test" style={{padding: '10px', margin: '10px', border: '1px solid'}}>
                <ul>
                    {result.data.jcr.nodeByPath.properties.map((property) => (
                        <li data-testid={property.name}>{property.name}={property.value}</li>
                    ))}
                </ul>
            </div>
            <hr/>
        </>
    )
}

TestGQL.jahiaComponent = defineJahiaComponent({
    nodeType: 'npmExample:testGQL',
    name: 'default',
    displayName: 'test JGQL (react)',
    componentType: 'view'
});
