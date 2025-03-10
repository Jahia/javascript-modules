import { jahiaComponent, server } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    nodeType: "javascriptExample:testBoundComponent",
    displayName: "test boundComponent",
    componentType: "view",
  },
  (_, { currentNode, renderContext }) => {
    const boundNode = server.render.getBoundNode(currentNode, renderContext);

    return (
      <>
        <h3>boundComponent usages</h3>
        <div data-testid="boundComponent_path">{boundNode ? boundNode.getPath() : "null"}</div>
        <hr />
      </>
    );
  },
);
