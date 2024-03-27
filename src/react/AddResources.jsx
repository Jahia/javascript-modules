import React from 'react';
import {useServerContext} from './useServerContext';
import {server} from '@jahia/js-server-core-private';

/**
 * Adds a resources to the head tag of the HTML page.
 * @param {Object} props - The properties for the component.
 * @param {boolean} [props.insert] - If true, the resource will be inserted into the document. Typically used for on-demand loading of resources.
 * @param {boolean} [props.async] - If true, the resource will be loaded asynchronously. For scripts, this means the script will be executed as soon as it's available, without blocking the rest of the page.
 * @param {boolean} [props.defer] - If true, the resource will be deferred, i.e., loaded after the document has been parsed. For scripts, this means the script will not be executed until after the page has loaded.
 * @param {string} props.type - The type of the resource. This could be 'javascript' for .js files, 'css' for .css files, etc.
 * @param {string} [props.resources] - The path to the resource file, relative to the module.
 * @param {string} [props.inlineResource] - Inline HTML that markup will be considered as resource.
 * @param {string} [props.title] - The title of the resource. This is typically not used for scripts or stylesheets, but may be used for other types of resources.
 * @param {string} [props.key] - A unique key for the resource. This could be used to prevent duplicate resources from being added to the document.
 * @param {string} [props.targetTag] - The HTML tag where the resource should be added. This could be 'head' for resources that should be added to the <head> tag, 'body' for resources that should be added to the <body> tag, etc.
 * @param {string} [props.rel] - The relationship of the resource to the document. This is typically 'stylesheet' for CSS files.
 * @param {string} [props.media] - The media for which the resource is intended. This is typically used for CSS files, with values like 'screen', 'print', etc.
 * @param {string} [props.condition] - A condition that must be met for the resource to be loaded. This could be used for conditional comments in IE, for example.
 * @returns A React element that renders a script or link tag.
 */
export function AddResources({...props}) {
    const {renderContext} = useServerContext();
    return (
        /* eslint-disable-next-line react/no-danger */
        <unwanteddiv dangerouslySetInnerHTML={{
            __html: server.render.addResources(props, renderContext)
        }}/>
    );
}
