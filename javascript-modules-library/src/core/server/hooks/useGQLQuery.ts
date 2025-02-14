import type { GraphQLFormattedError } from "graphql";
import { useServerContext } from "./useServerContext.js";
import { server } from "@jahia/javascript-modules-library-private";

/**
 * Execute a GraphQL query synchronously
 *
 * @returns The result of the query
 */
export const useGQLQuery = ({
  query,
  variables,
  operationName,
}: {
  /** The GraphQL query to execute */
  query: string;
  /** The variables to use for the query */
  variables?: Record<string, unknown>;
  /** The operation name to use for the query */
  operationName?: string;
  // Data will be any not to cause a breaking change in the type declaration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): { data: any; errors?: GraphQLFormattedError[] } => {
  const { renderContext } = useServerContext();
  return server.gql.executeQuerySync({
    query,
    variables,
    operationName,
    renderContext,
  });
};
