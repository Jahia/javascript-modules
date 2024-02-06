import React from 'react';
import {server} from '@jahia/js-server-engine-private';
import {useServerContext} from './ServerContext';

/**
 * Generates add content buttons for a content object
 * @param {Object} properties The React properties for the component.
 * @param {string} [properties.nodeTypes] The node types to add.
 * @param {string} [properties.childName='*'] The child name.
 * @param {boolean} [properties.editCheck=false] If true, the edit check will be performed.
 * @returns The add content buttons.
 */
const JAddContentButtons = ({nodeTypes, childName = '*', editCheck = false}) => {
    const {renderContext, currentResource} = useServerContext();
    return (
        /* eslint-disable-next-line react/no-danger */
        <unwanteddiv dangerouslySetInnerHTML={{
            __html: server.render.createContentButtons(childName,
                nodeTypes,
                editCheck,
                renderContext,
                currentResource)
        }}/>
    );
};

export default JAddContentButtons;
