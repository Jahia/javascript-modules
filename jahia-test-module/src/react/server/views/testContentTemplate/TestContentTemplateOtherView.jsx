import { jahiaComponent } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    nodeType: "javascriptExample:testContentTemplate",
    componentType: "view",
    name: "other",
  },
  () => (
    <>
      <h2>Just an other normal view</h2>
    </>
  ),
);
