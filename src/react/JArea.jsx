import React from 'react';
import {useServerContext} from './ServerContext';
import {server} from '@jahia/js-server-engine-private';

/**
 * Generates an area in editors may insert content objects.
 * @param {Object} props The React properties for the component.
 * @param {string} [props.name] The name of the area.
 * @param {string} [props.areaView] The view to use for the area.
 * @param {string[]} [props.allowedTypes] The allowed types for the area.
 * @param {number} [props.numberOfItems] The number of items to display in the area.
 * @param {string} [props.subNodesView] The view to use for the subnodes.
 * @param {string} [props.path] Relative (to the current node) or absolute path to the node to include
 * @param {string} [props.moduleType] Defines where the related storage list is located, area (default) for a local list (i.e. stored as a subnode of the current main resource),
 *                 absoluteArea for absolute.
 * @param {string} [props.editable] Enables or disables edition of this content in edit mode. Mainly used for absolute or references.
 * @param {number} [props.level] Ancestor level for absolute area - 0 is Home page, 1 first sub-pages, ...
 * @param {boolean} [props.areaAsSubNode] Allows area to be stored as a subnode
 * @param {string} [props.areaType] Content type
 * @param {boolean} [props.limitedAbsoluteAreaEdit] Is the absolute area editable everywhere or only on the page containing its node.
 * @returns The Area component
 */
const JArea = ({...props}) => {
    const {renderContext} = useServerContext();
    return (
        /* eslint-disable-next-line react/no-danger */
        <unwanteddiv dangerouslySetInnerHTML={{
            __html: server.render.renderArea(props, renderContext)
        }}/>
    );
};

export default JArea;
