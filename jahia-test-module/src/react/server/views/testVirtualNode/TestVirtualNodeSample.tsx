import { jahiaComponent } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    nodeType: "javascriptExample:testVirtualNodeSample",
    componentType: "view",
  },
  ({ myProperty }) => {
    return <div data-testid="testVirtualNodeSample_myProperty">{myProperty}</div>;
  },
);
