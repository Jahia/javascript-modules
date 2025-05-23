import { useServerContext } from "./useServerContext.js";
import { getNodesByJCRQuery } from "../utils/jcr/getNodesByJCRQuery.js";
import type { Node } from "javax.jcr";

/**
 * Execute a JCR query
 *
 * @returns The result of the query
 */
export const useJCRQuery = ({
  query,
}: {
  /** The JCR query to execute. */
  query: string;
}): Node[] => {
  const { renderContext } = useServerContext();
  return getNodesByJCRQuery(renderContext.getMainResource().getNode().getSession(), query, -1, 0);
};
