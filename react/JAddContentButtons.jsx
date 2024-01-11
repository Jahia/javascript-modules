import React from 'react';
import {render} from '@jahia/server-helpers';
import {useServerContext} from './ServerContext';
import PropTypes from 'prop-types';

const JAddContentButtons = ({nodeTypes, childName = '*', editCheck = false}) => {
    const {renderContext, currentResource} = useServerContext();
    return (
        /* eslint-disable-next-line no-warning-comments */
        // Todo we should find a way to strip this unwanted div here, check: https://stackoverflow.com/a/65033466
        /* eslint-disable-next-line react/no-danger */
        <div dangerouslySetInnerHTML={{
            __html: render.createContentButtons(childName,
                nodeTypes,
                editCheck,
                renderContext,
                currentResource)
        }}/>
    );
};

JAddContentButtons.propTypes = {
    nodeTypes: PropTypes.string,
    childName: PropTypes.string,
    /* eslint-disable-next-line react/boolean-prop-naming */
    editCheck: PropTypes.bool
};

export default JAddContentButtons;
