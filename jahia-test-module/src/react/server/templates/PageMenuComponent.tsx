import { jahiaComponent } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    nodeType: "jnt:page",
    name: "menuComponent",
    componentType: "view",
    properties: {
      type: "menuItem",
    },
  },
  (_, { currentResource }) => <>{currentResource.getNode().getPath()}</>,
);
