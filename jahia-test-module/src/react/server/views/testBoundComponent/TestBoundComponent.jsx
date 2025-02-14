import { defineJahiaComponent, server, useServerContext } from "@jahia/javascript-modules-library";

export const TestBoundComponent = () => {
  const { currentNode, renderContext } = useServerContext();
  const boundNode = server.render.getBoundNode(currentNode, renderContext);

  return (
    <>
      <h3>boundComponent usages</h3>
      <div data-testid="boundComponent_path">{boundNode ? boundNode.getPath() : "null"}</div>
      <hr />
    </>
  );
};

TestBoundComponent.jahiaComponent = defineJahiaComponent({
  nodeType: "npmExample:testBoundComponent",
  displayName: "test boundComponent",
  componentType: "view",
});
