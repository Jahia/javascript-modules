import { defineJahiaComponent, Render, useServerContext } from "@jahia/javascript-modules-library";

export const TestVirtualNode = () => {
  const { currentNode, renderContext } = useServerContext();
  const aliasedUser = renderContext.getMainResource().getNode().getSession().getAliasedUser();
  // create a virtual node (TestVirtualNodeSample)
  const testVirtualNodeSample = {
    name: "testVirtualNodeSample",
    nodeType: "javascriptExample:testVirtualNodeSample",
    properties: {
      myProperty: "this is a virtual node property",
    },
  };
  return (
    <>
      <h3>test virtual node</h3>
      <div data-testid="virtualNode">
        <div data-testid="virtualNode_aliasedUser">
          {aliasedUser == null ? "" : aliasedUser.getName()}
        </div>
        <Render content={testVirtualNodeSample} />
      </div>
      <hr />
    </>
  );
};

TestVirtualNode.jahiaComponent = defineJahiaComponent({
  nodeType: "javascriptExample:testVirtualNode",
  name: "default",
  displayName: "test virtual node",
  componentType: "view",
});
