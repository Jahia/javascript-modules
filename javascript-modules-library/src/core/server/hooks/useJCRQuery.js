import {useServerContext} from './useServerContext';
import {getNodesByJCRQuery} from '../utils/jcr';

/**
 * Execute a JCR query
 * @param {object} props the properties to execute the JCR query
 * @param {string} props.query the JCR query to execute
 * @returns {object} the result of the query
 */
export const useJCRQuery = ({query}) => {
    const {renderContext} = useServerContext();
    return getNodesByJCRQuery(renderContext.getMainResource().getNode().getSession(), query, -1, 0);
};
