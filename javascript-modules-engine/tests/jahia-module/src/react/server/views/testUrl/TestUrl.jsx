import React from 'react';
import {buildUrl, defineJahiaComponent, server, useServerContext, useUrlBuilder} from '@jahia/js-server-core';

export const TestUrl = () => {
    const {currentResource, renderContext} = useServerContext();
    const {buildNodeUrl, buildStaticUrl, buildHtmlFragmentUrl} = useUrlBuilder();

    const imageNodeRef = currentResource.getNode().hasProperty('image') ?
        currentResource.getNode().getProperty('image').getValue().getNode() :
        undefined;
    if (imageNodeRef) {
        server.render.addCacheDependency({path: imageNodeRef.getPath()}, renderContext)
    }

    const linkNodeRef = currentResource.getNode().hasProperty('linknode') ?
        currentResource.getNode().getProperty('linknode').getValue().getNode() :
        undefined;
    if (linkNodeRef) {
        server.render.addCacheDependency({path: linkNodeRef.getPath()}, renderContext)
    }

    return (
        <>
            <h3>Url helper testing component</h3>

            {imageNodeRef &&
                <div data-testid="image_reference">
                    <img height="150" src={buildNodeUrl({nodePath: imageNodeRef.getPath()})} alt="image"/>
                </div>}

            <div data-testid="image_static_resource">
                <img height="150" src={buildStaticUrl({assetPath: 'images/goat.jpg'})} alt="goat"/>
            </div>

            {linkNodeRef &&
                <>
                    <div data-testid="content_link">
                        <a href={buildNodeUrl({nodePath: linkNodeRef.getPath()})}>content link - current context</a>
                    </div>
                    <div data-testid="content_link_mode_edit">
                        <a href={buildNodeUrl({nodePath: linkNodeRef.getPath(), mode: 'edit'},)}>content link - edit</a>
                    </div>
                    <div data-testid="content_link_mode_preview">
                        <a href={buildNodeUrl({nodePath: linkNodeRef.getPath(), mode: 'preview'})}>content link -
                            preview</a>
                    </div>
                    <div data-testid="content_link_mode_live">
                        <a href={buildNodeUrl({nodePath: linkNodeRef.getPath(), mode: 'live'})}>content link - live</a>
                    </div>
                    <div data-testid="content_link_language_fr">
                        <a href={buildNodeUrl({nodePath: linkNodeRef.getPath(), language: 'fr'})}>content link - FR</a>
                    </div>
                    <div data-testid="content_link_parameters">
                        <a href={buildNodeUrl({
                            nodePath: linkNodeRef.getPath(),
                            parameters: {param1: 'value1', param2: 'value2'}
                        })}>content link - parameters</a>
                    </div>
                    <div data-testid="action_url">
                        <a href={buildNodeUrl({nodePath: linkNodeRef.getPath(), extension: '.myAction.do'})}>action
                            link</a>
                    </div>
                </>}
            <div data-testid="fragment_link">
                <a href={buildHtmlFragmentUrl({nodePath: '/sites/npmTestSite/home/testUrl/pagecontent/test'})}>fragment link</a>
            </div>
            <div data-testid="path_not_exists">
                <a href={buildNodeUrl({nodePath: '/sites/mySiteNotExists/home'})}>Using a path of node that does not exists</a>
            </div>
            <div data-testid="no_weakref">
                <a href={buildUrl({path: null})}>No weakref</a>
            </div>
        </>
    )
}

TestUrl.jahiaComponent = defineJahiaComponent({
    nodeType: 'npmExample:testUrl',
    name: 'default',
    displayName: 'test buildUrl',
    componentType: 'view'
});
