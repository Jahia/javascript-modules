import type { JCRNodeWrapper, JCRSessionWrapper } from "org.jahia.services.content";

/**
 * Returns a node from a path or identifier
 *
 * @param session - The JCR session.
 * @returns The node.
 */
export function getNodeFromPathOrId(
  props:
    | {
        /** The node identifier */
        identifier: string;
      }
    | {
        /** The node path */
        path: string;
      },
  session: JCRSessionWrapper,
): JCRNodeWrapper | null {
  if ("identifier" in props) {
    return session.getNodeByIdentifier(props.identifier);
  }

  if ("path" in props) {
    return session.getNode(props.path);
  }

  return null;
}
