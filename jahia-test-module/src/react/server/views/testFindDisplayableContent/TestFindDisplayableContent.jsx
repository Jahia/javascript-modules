import { jahiaComponent, server, useServerContext } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    nodeType: "javascriptExample:testFindDisplayableContent",
    name: "default",
    displayName: "test jFindDisplayableContent",
    componentType: "view",
  },
  (_, { renderContext }) => {
    const { currentResource } = useServerContext();
    console.log("renderContext", renderContext);

    let displayableNodePath = "";
    const targetNodeRef = currentResource.getNode().hasProperty("target")
      ? currentResource.getNode().getProperty("target").getValue().getNode()
      : undefined;
    if (targetNodeRef) {
      const displayableNode = server.render.findDisplayableNode(targetNodeRef, renderContext, null);
      if (displayableNode) {
        displayableNodePath = displayableNode.getPath();
      }
    }
    return (
      <>
        <h2>Test findDisplayableNode helper</h2>

        <p data-testid="displayableContent">Found displayable content: {displayableNodePath}</p>
      </>
    );
  },
);
