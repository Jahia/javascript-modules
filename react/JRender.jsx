import React from 'react';
import {render} from '@jahia/server-helpers';
import {useServerContext} from './ServerContext';
import PropTypes from 'prop-types';

const JRender = ({content, node, path, editable, advanceRenderingConfig, templateType, view, parameters}) => {
    const {renderContext, currentResource} = useServerContext();
    return (
        /* eslint-disable-next-line no-warning-comments */
        // Todo we should find a way to strip this unwanted div here, check: https://stackoverflow.com/a/65033466
        /* eslint-disable-next-line react/no-danger */
        <div dangerouslySetInnerHTML={{
            __html: render.render({
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

JRender.propTypes = {
    content: PropTypes.object,
    node: PropTypes.object,
    path: PropTypes.string,
    /* eslint-disable-next-line react/boolean-prop-naming */
    editable: PropTypes.bool,
    advanceRenderingConfig: PropTypes.string,
    templateType: PropTypes.string,
    view: PropTypes.string,
    parameters: PropTypes.object
};

export default JRender;
