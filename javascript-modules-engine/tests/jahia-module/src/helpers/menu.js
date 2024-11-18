import {buildUrl} from '@jahia/js-server-core';

/**
 * @typedef {Object} NavigationItem
 * @property {string} displayName
 * @property {string} url
 * @property {NavigationItem[]} children
 */
export const buildNode = (origNode, session, renderContext, currentResource) => {
    let node = session.getNode(origNode.getPath());

    /** @type {NavigationItem} */
    let navigationItem = {
        displayName: node.getI18N(currentResource.getLocale()).getProperty('jcr:title').getString(),
        url: buildUrl({path: node.getPath()}, renderContext, currentResource),
        children: node.getNodes().getSize() ?
            Array.from(node.getNodes())
                .filter(child => child.isNodeType('jnt:page'))
                .map(child => buildNode(child, session, renderContext, currentResource)) :
            null
    };
    return navigationItem;
};

