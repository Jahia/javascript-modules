import { useGQLQuery } from "@jahia/javascript-modules-library";
export const usePageAncestors = (workspace, path, types) => {
  const result = useGQLQuery({
    query: /* GraphQL */ `
      query ($workspace: Workspace!, $path: String!, $types: [String]!) {
        jcr(workspace: $workspace) {
          nodeByPath(path: $path) {
            ancestors(fieldFilter: { filters: [{ fieldName: "isNodeType", value: "true" }] }) {
              path
              isNodeType(type: { types: $types })
            }
          }
        }
      }
    `,
    variables: {
      workspace,
      path,
      types,
    },
  });
  // Currently no error handling is done, it will be implemented once handled by the framework
  return result.data ? result.data.jcr.nodeByPath.ancestors : [];
};
