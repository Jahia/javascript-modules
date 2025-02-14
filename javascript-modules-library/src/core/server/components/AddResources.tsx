import type {JSX} from 'react';
import {server} from '@jahia/javascript-modules-library-private';
import {useServerContext} from '../hooks/useServerContext.js';

/**
 * Adds a resources to the head tag of the HTML page.
 * @returns A React element that renders a script or link tag.
 */
export function AddResources(props: Readonly<{
    /** If true, the resource will be inserted into the document. Typically used for on-demand loading of resources. */
    insert?: boolean,
    /** If true, the resource will be loaded asynchronously. For scripts, this means the script will be executed as soon as it's available, without blocking the rest of the page. */
    async?: boolean,
    /** If true, the resource will be deferred, i.e., loaded after the document has been parsed. For scripts, this means the script will not be executed until after the page has loaded. */
    defer?: boolean,
    /** The type of the resource. This could be 'javascript' for .js files, 'css' for .css files, etc. */
    type?: 'javascript' | 'css',
    /** The path to the resource file, relative to the module. */
    resources?: string,
    /** Inline HTML that markup will be considered as resource. */
    inlineResource?: string,
    /** The title of the resource. This is typically not used for scripts or stylesheets, but may be used for other types of resources. */
    title?: string,
    /** A unique key for the resource. This could be used to prevent duplicate resources from being added to the document. */
    key?: string,
    /** The HTML tag where the resource should be added. This could be 'head' for resources that should be added to the <head> tag, 'body' for resources that should be added to the <body> tag, etc. */
    targetTag?: 'head' | 'body',
    /** The relationship of the resource to the document. This is typically 'stylesheet' for CSS files. */
    rel?: string,
    /** The media for which the resource is intended. This is typically used for CSS files, with values like 'screen', 'print', etc. */
    media?: string,
    /** A condition that must be met for the resource to be loaded. This could be used for conditional comments in IE, for example. */
    condition?: string
}>): JSX.Element {
    const {renderContext} = useServerContext();
    return (
        // @ts-expect-error <unwanteddiv> is not a valid HTML element
        <unwanteddiv dangerouslySetInnerHTML={{
            __html: server.render.addResources(props, renderContext)
        }}/>
    );
}
