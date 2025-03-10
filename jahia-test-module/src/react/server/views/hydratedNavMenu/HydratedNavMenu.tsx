import { HydrateInBrowser, jahiaComponent, server } from "@jahia/javascript-modules-library";
import SampleHydratedMenu from "$client/menu components/SampleHydratedMenu";
import { buildNode } from "../../../../helpers/menu.js";
import { useBaseNode } from "../../../../hooks/useBaseNode.js";
import { JCRCallback, type JCRSessionWrapper } from "org.jahia.services.content";

jahiaComponent(
  {
    nodeType: "javascriptExample:hydratedNavMenu",
    name: "default",
    displayName: "hydratedNavMenu",
    componentType: "view",
    properties: {
      "cache.mainResource": "true",
    },
  },
  (_, { currentResource, renderContext }) => {
    const base = currentResource.getNode().getPropertyAsString("j:baselineNode");
    const baseNode = useBaseNode(base, renderContext, renderContext.isLiveMode() ? "LIVE" : "EDIT");

    const staticMenu = server.jcr.doExecuteAsGuest(((session: JCRSessionWrapper) =>
      buildNode(
        baseNode,
        session,
        renderContext,
        currentResource,
      )) as unknown as JCRCallback<unknown>);

    return (
      <HydrateInBrowser
        child={SampleHydratedMenu}
        props={{ staticMenu: staticMenu, rootPath: baseNode.getPath() }}
      />
    );
  },
);
