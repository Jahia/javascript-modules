import {useServerContext} from './ServerContext';
import {server} from '@jahia/js-server-engine-private';

export default ({query, variables, operationName}) => {
    const {renderContext} = useServerContext();
    return server.gql.executeQuerySync({query, variables, operationName, renderContext});
};
