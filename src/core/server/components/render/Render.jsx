import React from 'react';
import {server} from '@jahia/js-server-core-private';
import {useServerContext} from '../../hooks/useServerContext';

/**
 * Render a content node
 * @param {object} props the properties for the render
 * @param {object} [props.content] the content node to render
 * @param {object} [props.node] the node to render
 * @param {string} [props.path] the path to render
 * @param {boolean} [props.editable] if the content should be editable
 * @param {string} [props.advanceRenderingConfig] specifies if we should render a node or simply include a view. Acceptable values are : none, INCLUDE or OPTION
 * @param {string} [props.templateType] the template type to use (html, json, ...)
 * @param {string} [props.view] the name of the view variant to use
 * @param {object} [props.parameters] the parameters to pass to the view
 * @returns {JSX.Element} the rendered output of the view for the specified content
 */
export function Render({content, node, path, editable = true, advanceRenderingConfig, templateType, view, parameters}) {
    const {renderContext, currentResource} = useServerContext();
    return (
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        /* eslint-disable-next-line react/no-danger */ // @ts-ignore
        <unwanteddiv dangerouslySetInnerHTML={{
            __html: server.render.render({
                content,
                node,
                path,
                editable,
                advanceRenderingConfig,
                templateType,
                view,
                parameters
            }, renderContext, currentResource)
        }}/>
    );
}
