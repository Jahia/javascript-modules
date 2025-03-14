import { buildUrl } from "@jahia/javascript-modules-library";
import { JCRNodeWrapper, JCRSessionWrapper } from "org.jahia.services.content";
import type { RenderContext, Resource } from "org.jahia.services.render";

interface NavigationItem {
  displayName: string;
  url: string;
  children: NavigationItem[] | null;
}

export const buildNode = (
  origNode: JCRNodeWrapper,
  session: JCRSessionWrapper,
  renderContext: RenderContext,
  currentResource: Resource,
): NavigationItem => {
  const node = session.getNode(origNode.getPath());

  return {
    displayName: node.getI18N(currentResource.getLocale()).getProperty("jcr:title").getString(),
    url: buildUrl({ path: node.getPath() }, renderContext, currentResource),
    children: node.getNodes().getSize()
      ? Array.from(node.getNodes())
          .filter((child: JCRNodeWrapper) => child.isNodeType("jnt:page"))
          .map((child: JCRNodeWrapper) => buildNode(child, session, renderContext, currentResource))
      : null,
  };
};
