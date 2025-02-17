import { jahiaComponent, Render } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    nodeType: "javascriptExample:testVirtualNode",
    name: "default",
    displayName: "test virtual node",
    componentType: "view",
  },
  (_, { renderContext }) => {
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
  },
);
