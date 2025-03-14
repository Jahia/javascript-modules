import { usePageAncestors } from "./usePageAncestors";
import type { RenderContext } from "org.jahia.services.render";
import type { JCRNodeWrapper } from "org.jahia.services.content";

/**
 * Get the base node for the navigation menu based on the various parameters
 *
 * @param baseline The baseline to use to get the base node. If not specified or if 'home', the
 *   site's home page will be used, if 'currentPage', the current page will be used
 * @param renderContext The current rendering context
 * @param workspace The workspace to use: 'default' for the edit workspace, 'live' for the live
 *   workspace
 * @returns The baseline node to use for the navigation menu
 */
export const useBaseNode = (
  baseline: string,
  renderContext: RenderContext,
  workspace: string,
): JCRNodeWrapper => {
  const mainResourceNode = renderContext.getMainResource().getNode();
  const pageAncestors = usePageAncestors(workspace, mainResourceNode.getPath(), ["jnt:page"]);
  if (!baseline || baseline === "home") {
    return renderContext.getSite().getHome();
  }

  if (baseline === "currentPage") {
    if (renderContext.getMainResource().getNode().isNodeType("jnt:page")) {
      return mainResourceNode;
    }

    if (pageAncestors.length > 0) {
      return mainResourceNode.getSession().getNode(pageAncestors.slice(-1)[0].path);
    }
  }

  return mainResourceNode;
};
