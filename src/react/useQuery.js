import {useServerContext} from './ServerContext';
import {server} from '@jahia/js-server-engine-private';

/**
 * Execute a GraphQL query synchronously
 * @param {Object} props the properties to execute the GraphQL query
 * @param {string} props.query the GraphQL query to execute
 * @param {Object} props.variables the variables to use for the query
 * @param {string} props.operationName the operation name to use for the query
 * @returns {Object} the result of the query
 */
export default ({query, variables, operationName}) => {
    const {renderContext} = useServerContext();
    return server.gql.executeQuerySync({query, variables, operationName, renderContext});
};