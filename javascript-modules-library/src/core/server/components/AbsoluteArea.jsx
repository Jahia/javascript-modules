import React from 'react';
import {useServerContext} from '../hooks/useServerContext';
import {server} from '@jahia/js-server-core-private';

/**
 * Generates an absolute area in which editors may insert content objects.
 * @param {object} props The React properties for the component.
 * @param {string} [props.name] The name of the area.
 * @param {string} [props.areaView] The view to use for the area.
 * @param {string[]} [props.allowedTypes] The allowed types for the area.
 * @param {number} [props.numberOfItems] The number of items to display in the area.
 * @param {string} [props.subNodesView] The view to use for the subnodes.
 * @param {string} [props.path] Relative (to the current node) or absolute path to the node to include
 * @param {boolean} [props.editable] Enables or disables edition of this content in edit mode. Mainly used for absolute or references.
 * @param {number} [props.level] Ancestor level for absolute area - 0 is Home page, 1 first sub-pages, ...
 * @param {string} [props.areaType] Content type to be used to create the area (by default jnt:contentList)
 * @param {boolean} [props.limitedAbsoluteAreaEdit] Is the absolute area editable everywhere or only on the page containing its node.
 * @param {object} [props.parameters] the parameters to pass to the absolute area
 * @returns {JSX.Element} The AbsoluteArea component
 */
export function AbsoluteArea({name, areaView, allowedTypes, numberOfItems, subNodesView, path, editable = true, level, areaType = 'jnt:contentList', limitedAbsoluteAreaEdit, parameters}) {
    const {renderContext} = useServerContext();
    return (
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        /* eslint-disable-next-line react/no-danger */ // @ts-ignore
        <unwanteddiv dangerouslySetInnerHTML={{
            __html: server.render.renderAbsoluteArea({
                name,
                areaView,
                allowedTypes,
                numberOfItems,
                subNodesView,
                path,
                editable,
                level,
                areaType,
                limitedAbsoluteAreaEdit,
                parameters
            }, renderContext)
        }}/>
    );
}
