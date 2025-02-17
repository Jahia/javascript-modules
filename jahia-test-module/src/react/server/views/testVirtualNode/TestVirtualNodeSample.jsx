import { getNodeProps, jahiaComponent } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    nodeType: "javascriptExample:testVirtualNodeSample",
    componentType: "view",
  },
  (_, { currentNode }) => {
    const props = getNodeProps(currentNode, ["myProperty"]);

    return <div data-testid="testVirtualNodeSample_myProperty">{props["myProperty"]}</div>;
  },
);
