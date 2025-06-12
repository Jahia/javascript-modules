import { jahiaComponent } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "process:env",
  },
  () => <h1>Mode: {process.env.NODE_ENV}</h1>,
);
