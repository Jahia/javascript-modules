/* eslint-disable @typescript-eslint/no-explicit-any */
import { print } from "@0no-co/graphql.web";
import type { TypedDocumentNode } from "@graphql-typed-document-node/core";
import type { GraphQLFormattedError } from "graphql";
import { useServerContext } from "./useServerContext.js";

/**
 * Execute a GraphQL query synchronously
 *
 * @returns The result of the query
 */
export function useGQLQuery<TData = any, TVariables = Record<string, any>>({
  query,
  variables,
  operationName,
}: {
  query: TypedDocumentNode<TData, TVariables>;
  variables?: TVariables;
  operationName?: string;
}): { data: TData; errors?: GraphQLFormattedError[] };
export function useGQLQuery({
  query,
  variables,
  operationName,
}: {
  query: string;
  variables?: Record<string, unknown>;
  operationName?: string;
}): { data: any; errors?: GraphQLFormattedError[] };
export function useGQLQuery({
  query,
  variables,
  operationName,
}: {
  /** The GraphQL query to execute */
  query: string | TypedDocumentNode;
  /** The variables to use for the query */
  variables?: Record<string, unknown>;
  /** The operation name to use for the query */
  operationName?: string;
}) {
  const { renderContext } = useServerContext();
  return JSON.parse(
    server.gql.executeQuerySync({
      query: typeof query === "string" ? query : print(query),
      variables,
      operationName,
      renderContext,
    }),
  );
}
