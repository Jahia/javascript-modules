import { jahiaComponent } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    nodeType: "javascriptExample:testCrashingView",
    name: "default",
    displayName: "test crashing view",
    componentType: "view",
  },
  (_, { currentNode }) => {
    currentNode.getProperty("not_existing_property");

    return <p>This view is expected to crash</p>;
  },
);
