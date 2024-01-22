import React from 'react';
import {useServerContext} from './ServerContext';
import PropTypes from 'prop-types';
import renderArea from '../utils/renderArea';

/**
 * Generates an area in editors may insert content objects.
 * @param {Object} props The React properties for the component.
 * @param {string} props.name The name of the area.
 * @param {string} props.areaView The view to use for the area.
 * @param {string[]} props.allowedTypes The allowed types for the area.
 * @param {number} props.numberOfItems The number of items to display in the area.
 * @param {string} props.subNodesView The view to use for the subnodes.
 * @returns {JSX.Element} The area component
 */
const JArea = ({...props}) => {
    const {renderContext} = useServerContext();
    return (
        /* eslint-disable-next-line no-warning-comments */
        // Todo we should find a way to strip this unwanted div here, check: https://stackoverflow.com/a/65033466
        /* eslint-disable-next-line react/no-danger */
        <div dangerouslySetInnerHTML={{
            __html: renderArea(props, renderContext)
        }}/>
    );
};

JArea.propTypes = {
    name: PropTypes.string,
    areaView: PropTypes.string,
    allowedTypes: PropTypes.array,
    numberOfItems: PropTypes.number,
    subNodesView: PropTypes.string
};

export default JArea;
