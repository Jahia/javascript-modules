import {server} from '@jahia/javascript-modules-library-private';
import {print} from 'graphql';
import gql from 'graphql-tag';
import type {JCRNodeWrapper} from 'org.jahia.services.content';
import type {RenderContext, Resource} from 'org.jahia.services.render';

const getPageAncestors = (workspace: string, path: string, types: string[]) => {
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

interface MenuItemChild {
    /** The page of a menu item child node */
    path: string;
}

/**
 * Get the children of a menu item that have a specific type
 * @param workspace the workspace to use: 'default' for the edit workspace, 'live' for the live workspace
 * @param path the path of the node to get the children from
 * @param types the types of the children to retrieve
 */
const getMenuItemsChildren = (workspace: string, path: string, types: string[]): MenuItemChild[] => {
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
 * @param baseline the baseline to use to get the base node. If not specified or if 'home', the site's home page will be used, if 'currentPage', the current page will be used
 * @param renderContext the current rendering context
 * @param workspace the workspace to use: 'default' for the edit workspace, 'live' for the live workspace
 * @returns the baseline node to use for the navigation menu
 */
const getBaseNode = (baseline: string, renderContext: RenderContext, workspace: string): JCRNodeWrapper => {
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

interface MenuEntry {
    /** The HTML rendered HTML menu entry */
    render: string;
    /** The node object for the menu entry */
    node: JCRNodeWrapper;
    /** Whether the node is in the path */
    inPath: boolean;
    /** Whether the node is selected */
    selected: boolean;
    /** The level of the node */
    level: number;
    /** The children of the node */
    children?: MenuEntry[];
}

interface MenuConfig {
    /** The current render context */
    renderContext: RenderContext,
    /** The current resource */
    currentResource: Resource,
    /** The workspace to use: 'default' for the edit workspace, 'live' for the live workspace */
    workspace: string,
    /** The name of the menu, used to match with the displayInMenuName property to see if this entry should be displayed in this specified menu */
    menuName: string,
    /** The level at which to start the menu */
    startLevelValue: number,
    /** The maximum depth of the menu */
    maxDepth: number,
    /** The view to use for each menu entry */
    menuEntryView?: string,
    /** The main resource node */
    mainResourceNode: JCRNodeWrapper
}

/**
 * Builds the menu entries for a given node with the given configuration (see parameters)
 * @param node the node from which to start building the menu
 * @param navMenuLevel the current depth of the menu (1 for the root, 2 for the children of the root, etc.)
 * @param config the configuration object to build the navigation menu
 * @param children the paths of the children of the current node
 * @returns an array of menu entries objects
 */
const buildMenu = (node: JCRNodeWrapper, navMenuLevel: number, config: MenuConfig, children: MenuItemChild[] = []): MenuEntry[] => {
    const result: MenuEntry[] = [];
    if (node) {
        const session = node.getSession();
        if (!children) {
            children = getMenuItemsChildren(config.workspace, node.getPath(), ['jmix:navMenuItem']);
        }

        for (let index = 0; index < children.length; index++) {
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
            if (menuItem.hasProperty('j:displayInMenuName')) {
                correctType = false;
                menuItem.getProperty('j:displayInMenuName').getValues().forEach(displayMenuValue => {
                    correctType = correctType || (displayMenuValue.getString() === config.menuName);
                });
            }

            if (!referenceIsBroken && correctType && (config.startLevelValue < navMenuLevel || inpath)) {
                const menuEntry: MenuEntry = {
                    node: menuItem,
                    inPath: inpath,
                    selected,
                    level: navMenuLevel,
                    render: '',
                    children: []
                };

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

                result.push(menuEntry);
            }
        }
    }

    return result;
};

/**
 * Build a navigation menu
 * @param maxDepth the maximum depth of the menu
 * @param base the base path of the menu
 * @param menuEntryView the view to use for each menu entry
 * @param startLevelValue the level at which to start the menu
 * @param renderContext the current render context
 * @param currentResource the current resource
 * @returns an array of menu entries objects
 */
/* eslint-disable-next-line max-params */
export function buildNavMenu(maxDepth: number, base: string, menuEntryView: string, startLevelValue: number, renderContext: RenderContext, currentResource: Resource): MenuEntry[] {
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
