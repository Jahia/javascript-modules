import {buildNavMenu} from '../../../navBuilder';

/**
 * Helper to build a navigation array (used to build nav menus)
 */
export default options => {
    return buildNavMenu(
        parseInt(options.hash.maxDepth, 10),
        options.hash.baseNode,
        options.hash.menuEntryView,
        (options.hash.startLevel ? parseInt(options.hash.startLevel, 10) : 0),
        options.data.root.renderContext,
        options.data.root.currentResource
    );
};
