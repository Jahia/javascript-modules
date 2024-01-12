import React from 'react';
import {useServerContext} from './ServerContext';
import PropTypes from 'prop-types';
import {server} from '@jahia/js-server-engine-private';

const JAddResources = ({...props}) => {
    const {renderContext} = useServerContext();
    return (
        /* eslint-disable-next-line no-warning-comments */
        // Todo we should find a way to strip this unwanted div here, check: https://stackoverflow.com/a/65033466
        /* eslint-disable-next-line react/no-danger */
        <div dangerouslySetInnerHTML={{
            __html: server.render.addResourcesTag(props, renderContext)
        }}/>
    );
};

JAddResources.propTypes = {
    name: PropTypes.string,
    areaView: PropTypes.string,
    allowedTypes: PropTypes.array,
    numberOfItems: PropTypes.number,
    subNodesView: PropTypes.string
};

export default JAddResources;
