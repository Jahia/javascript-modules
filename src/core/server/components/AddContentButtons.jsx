import React from 'react';
import {server} from '@jahia/js-server-core-private';
import {useServerContext} from '../hooks/useServerContext';

/**
 * Generates add content buttons for a content object
 * @param {object} properties The React properties for the component.
 * @param {string} [properties.nodeTypes] The node types to add.
 * @param {string} [properties.childName='*'] The child name.
 * @param {boolean} [properties.editCheck=false] If true, the edit check will be performed.
 * @returns {JSX.Element} The add content buttons.
 */
export function AddContentButtons({nodeTypes, childName = '*', editCheck = false}) {
    const {renderContext, currentResource} = useServerContext();
    return (
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        /* eslint-disable-next-line react/no-danger */ // @ts-ignore
        <unwanteddiv dangerouslySetInnerHTML={{
            __html: server.render.createContentButtons(childName,
                nodeTypes,
                editCheck,
                renderContext,
                currentResource)
        }}/>
    );
}
