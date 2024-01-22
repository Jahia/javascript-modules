import {buildNavMenu} from '../navBuilder';
import {useServerContext} from './ServerContext';

/**
 * Build a navigation menu
 * @param maxDepth the maximum depth of the menu
 * @param base the base path of the menu
 * @param menuEntryView the view to use for each menu entry
 * @param startLevel the level at which to start the menu
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
