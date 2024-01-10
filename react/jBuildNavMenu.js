import {buildNavMenu} from '../navBuilder';
import {useServerContext} from './ServerContext';

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
