import { jahiaComponent, Render } from "@jahia/javascript-modules-library";
import { Layout } from "../Layout.jsx";

jahiaComponent(
  {
    componentType: "template",
    nodeType: "jmix:mainResource",
  },
  ({ "jcr:title": title }, { currentNode }) => (
    <Layout title={title}>
      <Render node={currentNode} view="fullPage" />
    </Layout>
  ),
);
