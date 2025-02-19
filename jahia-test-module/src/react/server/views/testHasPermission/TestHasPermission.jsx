import { defineJahiaComponent, useServerContext } from "@jahia/javascript-modules-library";

export const testHasPermission = () => {
  const { currentNode } = useServerContext();
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
};

testHasPermission.jahiaComponent = defineJahiaComponent({
  nodeType: "javascriptExample:testHasPermission",
  name: "default",
  displayName: "test has permission",
  componentType: "view",
});
