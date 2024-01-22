import {buildNavMenu} from '../navBuilder';
import {useServerContext} from './ServerContext';

/**
 * Build a navigation menu
 * @param {number} maxDepth the maximum depth of the menu
 * @param {string} base the base path of the menu
 * @param {string} menuEntryView the view to use for each menu entry
 * @param {number} startLevel the level at which to start the menu
 */
export default (maxDepth, base, menuEntryView, startLevel) => {
    const {currentResource, renderContext} = useServerContext();

    return buildNavMenu(
        maxDepth,
        base,
        menuEntryView,
        startLevel,
        renderContext,
        currentResource
    );
};
