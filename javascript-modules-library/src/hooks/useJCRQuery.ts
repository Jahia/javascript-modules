import { useServerContext } from "./useServerContext.js";
import { getNodesByJCRQuery } from "../utils/jcr/getNodesByJCRQuery.js";
import type { JCRNodeWrapper } from "org.jahia.services.content";

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
}): JCRNodeWrapper[] => {
  const { renderContext } = useServerContext();
  return getNodesByJCRQuery(renderContext.getMainResource().getNode().getSession(), query, -1, 0);
};
