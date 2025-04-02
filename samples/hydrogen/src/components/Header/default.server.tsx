import { jahiaComponent, RenderChild } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "hydrogen:header",
  },
  () => <RenderChild name="hero" view="small" />,
);
