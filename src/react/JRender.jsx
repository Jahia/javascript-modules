import React from 'react';
import {server} from '@jahia/js-server-engine-private';
import {useServerContext} from './ServerContext';

/**
 * Render a content node
 * @param {Object} props the properties for the render
 * @param {Object} [props.content] the content node to render
 * @param {Object} [props.node] the node to render
 * @param {string} [props.path] the path to render
 * @param {bool} [props.editable] if the content should be editable
 * @param {string} [props.advanceRenderingConfig] specifies if we should render a node or simply include a view. Acceptable values are : none, INCLUDE or OPTION
 * @param {string} [props.templateType] the template type to use (html, json, ...)
 * @param {string} [props.view] the name of the view variant to use
 * @param {Object} [props.parameters] the parameters to pass to the view
 * @returns the rendered output of the view for the specified content
 */
const JRender = ({content, node, path, editable = true, advanceRenderingConfig, templateType, view, parameters}) => {
    const {renderContext, currentResource} = useServerContext();
    return (
        /* eslint-disable-next-line react/no-danger */
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
};

export default JRender;
