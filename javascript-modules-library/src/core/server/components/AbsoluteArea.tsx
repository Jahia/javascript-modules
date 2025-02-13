import type React from 'react';
import {useServerContext} from '../hooks/useServerContext.js';
import {server} from '@jahia/javascript-modules-library-private';

/**
 * Generates an absolute area in which editors may insert content objects.
 * @returns The AbsoluteArea component
 */
export function AbsoluteArea({name, areaView, allowedTypes, numberOfItems, subNodesView, path, editable = true, level, areaType = 'jnt:contentList', limitedAbsoluteAreaEdit, parameters}: Readonly<{
    /** The name of the area. */
    name?: string,
    /** The view to use for the area. */
    areaView?: string,
    /** The allowed types for the area. */
    allowedTypes?: string[],
    /** The number of items to display in the area. */
    numberOfItems?: number,
    /** The view to use for the subnodes. */
    subNodesView?: string,
    /** Relative (to the current node) or absolute path to the node to include. */
    path?: string,
    /**
     * Enables or disables edition of this content in edit mode. Mainly used for absolute or references.
     * @default true
     */
    editable?: boolean,
    /** Ancestor level for absolute area - 0 is Home page, 1 first sub-pages, ... */
    level?: number,
    /**
     * Content type to be used to create the area
     * @default jnt:contentList
     */
    areaType?: string,
    /** Is the absolute area editable everywhere or only on the page containing its node. */
    limitedAbsoluteAreaEdit?: boolean,
    /** The parameters to pass to the absolute area */
    parameters?: Record<string, unknown>
}>): React.JSX.Element {
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
