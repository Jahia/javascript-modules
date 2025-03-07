import { jahiaComponent } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    nodeType: "javascriptExample:testRender",
    name: "tagged",
    displayName: "test Render (tagged react)",
    componentType: "view",
  },
  (_, { currentResource }) => {
    return <div>display tags: {currentResource.getNode().getPropertyAsString("j:tagList")}</div>;
  },
);
