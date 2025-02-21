import { HydrateInBrowser, jahiaComponent, server } from "@jahia/javascript-modules-library";
import SampleHydratedMenu from "$client/components/SampleHydratedMenu";
import { buildNode } from "../../../../helpers/menu";
import { useBaseNode } from "../../../../hooks/useBaseNode";

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
    const staticMenu = server.jcr.doExecuteAsGuest((session) =>
      buildNode(baseNode, session, renderContext, currentResource),
    );

    return (
      <HydrateInBrowser
        child={SampleHydratedMenu}
        props={{ staticMenu: staticMenu, rootPath: baseNode.getPath() }}
      />
    );
  },
);
