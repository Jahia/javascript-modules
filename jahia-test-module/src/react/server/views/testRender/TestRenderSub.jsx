import { jahiaComponent } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    nodeType: "javascriptExample:testRender",
    name: "sub",
    displayName: "test Render (sub react)",
    componentType: "view",
  },
  (_, { currentResource }) => {
    return (
      <div>
        Sub view {currentResource.getNode().getName()} <br />
        prop1={currentResource.getNode().getPropertyAsString("prop1")}
      </div>
    );
  },
);
