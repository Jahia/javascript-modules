import {gql as gqlServer, render} from '@jahia/server-helpers';
import {gql} from '@apollo/client';
import {print} from 'graphql';

const getPageAncestors = (workspace, path) => {
    const result = gqlServer.executeQuerySync({
        query: print(gql`
            query ($workspace: Workspace!, $path: String!){
                jcr(workspace: $workspace) {
                    nodeByPath(path: $path) {
                        ancestors(fieldFilter: {filters:[{fieldName:"isNodeType", value:"true"}]}) {
                            path
                            isNodeType(type: {types: ["jnt:page"]})
                        }
                    }
                }
            }
        `),
        variables: {
            workspace,
            path
        }
    });
    // Currently no error handling is done, it will be implemented once handled by the framework
    return result.data ? result.data.jcr.nodeByPath.ancestors : [];
};

const getMenuItemsChildren = (workspace, path) => {
    const result = gqlServer.executeQuerySync({
        query: print(gql`
            query childrenOfType($workspace: Workspace!, $path: String!){
                jcr(workspace: $workspace) {
                    nodeByPath(path: $path) {
                        children(typesFilter: {types:["jmix:navMenuItem"]}) {
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
            path
        }
    });
    // Currently no error handling is done, it will be implemented once handled by the framework
    return result.data ? result.data.jcr.nodeByPath.children.nodes : [];
};

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

const buildMenu = (node, navMenuLevel, config) => {
    let result = [];
    if (node) {
        const session = node.getSession();
        const children = getMenuItemsChildren(config.workspace, node.getPath(), ['jmix:navMenuItem']);

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
                menuItem.getProperty('j:displayInMenuName').getValues().each(displayMenuValue => {
                    correctType |= (displayMenuValue.getString() === config.menuName);
                });
            }

            if (!referenceIsBroken && correctType && (config.startLevelValue < navMenuLevel || inpath)) {
                const hasChildren = navMenuLevel < config.maxDepth && getMenuItemsChildren(config.workspace, menuItem.getPath()).length > 0;
                if (config.startLevelValue < navMenuLevel) {
                    config.currentResource.getDependencies().add(menuItem.getCanonicalPath());
                    menuEntry.render = render.render({
                        path: menuItem.getPath(),
                        view: config.menuEntryView || 'menuElement'
                    }, config.renderContext, config.currentResource);
                }

                if (hasChildren) {
                    menuEntry.children = buildMenu(menuItem, navMenuLevel + 1, config);
                }

                menuEntry.node = menuItem;
                menuEntry.inPath = inpath;
                menuEntry.selected = selected;
                menuEntry.level = navMenuLevel;
            }

            result.push(menuEntry);
        }
    }

    return result;
};

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
