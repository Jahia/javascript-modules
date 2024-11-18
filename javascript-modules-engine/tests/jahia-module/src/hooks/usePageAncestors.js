import {useGQLQuery} from '@jahia/js-server-core';
import {print} from 'graphql/index';
import gql from 'graphql-tag';

export const usePageAncestors = (workspace, path, types) => {
    const result = useGQLQuery({
        query: print(gql`
            query ($workspace: Workspace!, $path: String!, $types: [String]!){
                jcr(workspace: $workspace) {
                    nodeByPath(path: $path) {
                        ancestors(fieldFilter: {filters:[{fieldName:"isNodeType", value:"true"}]}) {
                            path
                            isNodeType(type: {types: $types})
                        }
                    }
                }
            }
        `),
        variables: {
            workspace,
            path,
            types
        }
    });
    // Currently no error handling is done, it will be implemented once handled by the framework
    return result.data ? result.data.jcr.nodeByPath.ancestors : [];
};
