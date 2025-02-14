import type {JSX} from 'react';
import {server} from '@jahia/javascript-modules-library-private';
import {useServerContext} from '../hooks/useServerContext.js';

/**
 * Generates add content buttons for a content object
 * @returns The add content buttons.
 */
export function AddContentButtons({nodeTypes = '', childName = '*', editCheck = false}: Readonly<{
    /** The node types to add. */
    nodeTypes?: string;
    /**
     * The child name.
     * @default *
     */
    childName?: string;
    /**
     * If true, the edit check will be performed.
     * @default false
     */
    editCheck?: boolean;
}>): JSX.Element {
    const {renderContext, currentResource} = useServerContext();
    return (
        // @ts-expect-error <unwanteddiv> is not a valid HTML element
        <unwanteddiv dangerouslySetInnerHTML={{
            __html: server.render.createContentButtons(childName,
                nodeTypes,
                editCheck,
                renderContext,
                currentResource)
        }}/>
    );
}
