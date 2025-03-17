import type { Node } from "javax.jcr";
import type { JCRNodeWrapper } from "org.jahia.services.content";

/**
 * Returns an array of child nodes of a given node.
 *
 * @param node The node to get the child nodes from.
 * @param limit The maximum number of nodes to return (-1 to return all nodes, but be careful with
 *   this as it can be very slow and memory consuming, it's better to use a reasonable limit and use
 *   pagination if needed)
 * @param offset The offset to start from
 * @param filter A function to filter the nodes to be returned.
 * @returns An array of child nodes.
 */
export function getChildNodes(
  node: JCRNodeWrapper,
  limit: number | undefined = undefined,
  offset = 0,
  filter: ((node: JCRNodeWrapper) => boolean) | undefined = undefined,
): JCRNodeWrapper[] {
  const result: JCRNodeWrapper[] = [];

  if (!node || !limit) {
    console.warn("Missing one or more mandatory parameters (node, limit) to getChildNodes");
    return result;
  }

  const iterator = node.getNodes();
  let skipped = 0; // Track how many nodes have been skipped
  while (iterator.hasNext()) {
    const child = iterator.nextNode();

    // Skip nodes until reaching the offset
    if (skipped < offset) {
      if (!filter || filter(child as JCRNodeWrapper)) {
        skipped++;
      }

      continue;
    }

    if (!filter || filter(child as JCRNodeWrapper)) {
      result.push(child as JCRNodeWrapper);
      if (limit > 0 && result.length >= limit) {
        break;
      }
    }
  }

  return result;
}
