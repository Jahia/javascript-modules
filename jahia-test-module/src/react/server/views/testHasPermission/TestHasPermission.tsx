import { jahiaComponent } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    nodeType: "javascriptExample:testHasPermission",
    name: "default",
    displayName: "test has permission",
    componentType: "view",
  },
  (_, { currentNode }) => {
    return (
      <>
        <h3>Node has permission</h3>
        <div data-testid="currentNode_hasPermission">
          {currentNode.hasPermission("component-javascriptExampleMix_javascriptExampleComponent")
            ? "true"
            : "false"}
        </div>
        <h3>Node doesn't have permission</h3>
        <div data-testid="currentNode_hasNotPermission">
          {currentNode.hasPermission("fakePermission") ? "true" : "false"}
        </div>
      </>
    );
  },
);
