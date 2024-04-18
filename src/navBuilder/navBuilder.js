import {server} from '@jahia/js-server-core-private';
import {gql} from '@apollo/client';
import {print} from 'graphql';

const getPageAncestors = (workspace, path, types) => {
    const result = server.gql.executeQuerySync({
        query: print(gql`
            query ($workspace: Workspace!, $path: String!, $types: [String]!){
                jcr(workspace: $workspace) {
                    nodeByPath(path: $path) {
                        ancestors(fieldFilter: {filters:[{fieldName:"isNodeType", value:"true"}]}) {
                            path
                            isNodeType(type: {types: $types})
                        }
                    }
                }
            }
        `),
        variables: {
            workspace,
            path,
            types
        }
    });
    // Currently no error handling is done, it will be implemented once handled by the framework
    return result.data ? result.data.jcr.nodeByPath.ancestors : [];
};

/**
 * @typedef {Object} MenuItemChild
 * @property {string} path - The page of a menu item child node
 */

/**
 * Get the children of a menu item that have a specific type
 * @param {string} workspace the workspace to use: 'default' for the edit workspace, 'live' for the live workspace
 * @param {string} path the path of the node to get the children from
 * @param {string[]} types the types of the children to retrieve
 * @returns {MenuItemChild[]}
 */
const getMenuItemsChildren = (workspace, path, types) => {
    const result = server.gql.executeQuerySync({
        query: print(gql`
            query childrenOfType($workspace: Workspace!, $path: String!, $types: [String]!){
                jcr(workspace: $workspace) {
                    nodeByPath(path: $path) {
                        children(typesFilter: {types:$types}) {
                            nodes {
                                path
                            }
                        }
                    }
                }
            }
        `),
        variables: {
            workspace,
            path,
            types
        }
    });
    // Currently no error handling is done, it will be implemented once handled by the framework
    return result.data ? result.data.jcr.nodeByPath.children.nodes : [];
};

/**
 * Get the base node for the navigation menu based on the various parameters
 * @param {string} baseline the baseline to use to get the base node. If not specified or if 'home', the site's home page will be used, if 'currentPage', the current page will be used
 * @param {import('org.jahia.services.render').RenderContext} renderContext the current rendering context
 * @param {string} workspace the workspace to use: 'default' for the edit workspace, 'live' for the live workspace
 * @returns {import('org.jahia.services.content').JCRNodeWrapper} the baseline node to use for the navigation menu
 */
const getBaseNode = (baseline, renderContext, workspace) => {
    const mainResourceNode = renderContext.getMainResource().getNode();
    const pageAncestors = getPageAncestors(workspace, mainResourceNode.getPath(), ['jnt:page']);
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

/**
 * @typedef {Object} MenuEntry
 * @property {string} render - The HTML rendered HTML menu entry
 * @property {import('org.jahia.services.content').JCRNodeWrapper} node - The node object for the menu entry
 * @property {boolean} inPath - Whether the node is in the path.
 * @property {boolean} selected - Whether the node is selected.
 * @property {number} level - The level of the node.
 * @property {MenuEntry[]} [children] - The children of the node
 */

/**
 * @typedef {Object} MenuConfig
 * @property {import('org.jahia.services.render').RenderContext} renderContext - The current render context
 * @property {import('org.jahia.services.render').Resource} currentResource - The current resource
 * @property {string} workspace - The workspace to use: 'default' for the edit workspace, 'live' for the live workspace
 * @property {string} menuName - The name of the menu, used to match with the displayInMenuName property to see if this
 * entry should be displayed in this specified menu
 * @property {number} startLevelValue - The level at which to start the menu
 * @property {number} maxDepth - The maximum depth of the menu
 * @property {string} [menuEntryView] - The view to use for each menu entry
 * @property {import('org.jahia.services.content').JCRNodeWrapper} mainResourceNode - The main resource node
 */

/**
 * Builds the menu entries for a given node with the given configuration (see parameters)
 * @param {import('org.jahia.services.content').JCRNodeWrapper} node the node from which to start building the menu
 * @param {number} navMenuLevel the current depth of the menu (1 for the root, 2 for the children of the root, etc.)
 * @param {MenuConfig} config the configuration object to build the navigation menu
 * @param {MenuItemChild[]} [children] the paths of the children of the current node
 * @returns {MenuEntry[]} an array of menu entries objects
 */
const buildMenu = (node, navMenuLevel, config, children) => {
    let result = [];
    if (node) {
        const session = node.getSession();
        if (!children) {
            children = getMenuItemsChildren(config.workspace, node.getPath(), ['jmix:navMenuItem']);
        }

        for (let index = 0; index < children.length; index++) {
            const menuEntry = {};
            const child = children[index];
            const itemPath = child.path;
            const menuItem = session.getNode(itemPath);
            const inpath = config.mainResourceNode.getPath() === itemPath || config.mainResourceNode.getPath().startsWith(itemPath + '/');
            let selected = false;
            let referenceIsBroken = false;
            let correctType = true;

            // Handle selection
            if (menuItem.isNodeType('jmix:nodeReference')) {
                config.currentResource.getDependencies().add(menuItem.getPropertyAsString('j:node'));
                const refNode = menuItem.getProperty('j:node').getNode();
                if (refNode) {
                    selected = config.mainResourceNode.getPath() === refNode.getPath();
                } else {
                    selected = false;
                    referenceIsBroken = true;
                }
            } else {
                selected = config.mainResourceNode.getPath() === menuItem.getPath();
            }

            // This should be filled by a simple custom choicelist initializer in this module that provides the list of declared menus
            // Not done yet as in the current state it is not possible to register choicelist initializers.
            // Check if menu item is explicitly not display in menu
            if (menuItem.hasProperty['j:displayInMenuName']) {
                correctType = false;
                menuItem.getProperty('j:displayInMenuName').getValues().forEach(displayMenuValue => {
                    correctType = correctType || (displayMenuValue.getString() === config.menuName);
                });
            }

            if (!referenceIsBroken && correctType && (config.startLevelValue < navMenuLevel || inpath)) {
                if (navMenuLevel < config.maxDepth) {
                    const menuItemChildren = getMenuItemsChildren(config.workspace, menuItem.getPath(), ['jmix:navMenuItem']);
                    if (menuItemChildren.length > 0) {
                        menuEntry.children = buildMenu(menuItem, navMenuLevel + 1, config, menuItemChildren);
                    }
                }

                if (config.startLevelValue < navMenuLevel) {
                    config.currentResource.getDependencies().add(menuItem.getCanonicalPath());
                    menuEntry.render = server.render.render({
                        path: menuItem.getPath(),
                        view: config.menuEntryView || 'menuElement'
                    }, config.renderContext, config.currentResource);
                }

                menuEntry.node = menuItem;
                menuEntry.inPath = inpath;
                menuEntry.selected = selected;
                menuEntry.level = navMenuLevel;
            }

            result.push(menuEntry);
        }
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return result;
};

/**
 * Build a navigation menu
 * @param {number} maxDepth the maximum depth of the menu
 * @param {string} base the base path of the menu
 * @param {string} menuEntryView the view to use for each menu entry
 * @param {number} startLevelValue the level at which to start the menu
 * @param {import('org.jahia.services.render').RenderContext} renderContext the current render context
 * @param {import('org.jahia.services.render').Resource} currentResource the current resource
 * @returns {MenuEntry[]} an array of menu entries objects
 */
/* eslint-disable-next-line max-params */
export function buildNavMenu(maxDepth, base, menuEntryView, startLevelValue, renderContext, currentResource) {
    const workspace = renderContext.isLiveMode() ? 'LIVE' : 'EDIT';

    return buildMenu(getBaseNode(base, renderContext, workspace), 1, {
        renderContext,
        mainResourceNode: renderContext.getMainResource().getNode(),
        currentResource,
        workspace,
        menuName: currentResource.getNode().getName(),
        startLevelValue,
        maxDepth,
        menuEntryView
    });
}
