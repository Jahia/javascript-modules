import {usePageAncestors} from './usePageAncestors';

/**
 * Get the base node for the navigation menu based on the various parameters
 * @param {string} baseline the baseline to use to get the base node. If not specified or if 'home', the site's home page will be used, if 'currentPage', the current page will be used
 * @param {import('org.jahia.services.render').RenderContext} renderContext the current rendering context
 * @param {string} workspace the workspace to use: 'default' for the edit workspace, 'live' for the live workspace
 * @returns {import('org.jahia.services.content').JCRNodeWrapper} the baseline node to use for the navigation menu
 */
export const useBaseNode = (baseline, renderContext, workspace) => {
    const mainResourceNode = renderContext.getMainResource().getNode();
    const pageAncestors = usePageAncestors(workspace, mainResourceNode.getPath(), ['jnt:page']);
    if (!baseline || baseline === 'home') {
        return renderContext.getSite().getHome();
    }

    if (baseline === 'currentPage') {
        if (renderContext.getMainResource().getNode().isNodeType('jnt:page')) {
            return mainResourceNode;
        }

        if (pageAncestors.length > 0) {
            return mainResourceNode.getSession().getNode(pageAncestors.slice(-1)[0].path);
        }
    }

    return mainResourceNode;
};
