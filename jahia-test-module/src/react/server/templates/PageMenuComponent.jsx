import { defineJahiaComponent, useServerContext } from "@jahia/javascript-modules-library";

export const PageMenuComponent = () => {
  const { currentResource } = useServerContext();
  return currentResource.getNode().getPath();
};

PageMenuComponent.jahiaComponent = defineJahiaComponent({
  nodeType: "jnt:page",
  name: "menuComponent",
  componentType: "view",
  properties: {
    type: "menuItem",
  },
});
