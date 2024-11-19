import {useServerContext} from './useServerContext';
import {server} from '@jahia/javascript-modules-library-private';

/**
 * Execute a GraphQL query synchronously
 * @param {object} props the properties to execute the GraphQL query
 * @param {string} props.query the GraphQL query to execute
 * @param {object} props.variables the variables to use for the query
 * @param {string} props.operationName the operation name to use for the query
 * @returns {object} the result of the query
 */
export const useGQLQuery = ({query, variables, operationName}) => {
    const {renderContext} = useServerContext();
    return server.gql.executeQuerySync({query, variables, operationName, renderContext});
};
