import React from 'react';
import {defineJahiaComponent, HydrateInBrowser, server, useServerContext} from '@jahia/js-server-core';
import SampleHydratedMenu from "../../../../client/SampleHydratedMenu";
import {buildNode} from "../../../../helpers/menu";
import {useBaseNode} from "../../../../hooks/useBaseNode";

export const HydratedNavMenu = () => {
    const {renderContext, currentResource} = useServerContext();
    const base = currentResource.getNode().getPropertyAsString('j:baselineNode');
    const baseNode = useBaseNode(base, renderContext, renderContext.isLiveMode() ? 'LIVE' : 'EDIT');
    const staticMenu = server.jcr.doExecuteAsGuest(session => buildNode(baseNode, session, renderContext, currentResource));

    return (
        <HydrateInBrowser child={SampleHydratedMenu} props={{staticMenu: staticMenu, rootPath: baseNode.getPath()}}/>
    )
}

HydratedNavMenu.jahiaComponent = defineJahiaComponent({
    nodeType: 'npmExample:hydratedNavMenu',
    name: 'default',
    displayName: 'hydratedNavMenu',
    componentType: 'view',
    properties: {
        'cache.mainResource': 'true'
    }
});
