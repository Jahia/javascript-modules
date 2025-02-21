import { jahiaComponent } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    nodeType: "javascriptExample:testIsNodeType",
    name: "default",
    displayName: "test is node type",
    componentType: "view",
  },
  (_, { currentNode }) => {
    return (
      <>
        <h3>Current node type is testIsNodeType</h3>
        <div data-testid="currentNode_isNodeType">
          {currentNode.isNodeType("javascriptExample:testIsNodeType") ? "true" : "false"}
        </div>

        <h3>Current node type is not jnt:page</h3>
        <div data-testid="currentNode_isNotNodeType">
          {currentNode.isNodeType("jnt:page") ? "true" : "false"}
        </div>
      </>
    );
  },
);
