import { jahiaComponent } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "process:env",
  },
  // eslint-disable-next-line no-restricted-globals -- `process.env.NODE_ENV` is the one `process` usage that works server-side: this plugin replaces it at build time
  () => <h1>Mode: {process.env.NODE_ENV}</h1>,
);
