import {useServerContext} from './useServerContext';
import {getNodesByJCRQuery} from '../utils/jcr/getNodesByJCRQuery';
import type {Node} from 'javax.jcr';

/**
 * Execute a JCR query
 * @returns the result of the query
 */
export const useJCRQuery = ({query}: {
    /** The JCR query to execute. */
    query: string
}): Node[] => {
    const {renderContext} = useServerContext();
    return getNodesByJCRQuery(renderContext.getMainResource().getNode().getSession(), query, -1, 0);
};
