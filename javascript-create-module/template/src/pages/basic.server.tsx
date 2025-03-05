import { Area, jahiaComponent } from "@jahia/javascript-modules-library";
import { Layout } from "./Layout.jsx";

jahiaComponent(
  {
    nodeType: "jnt:page",
    name: "basic",
    displayName: "Basic page",
    componentType: "template",
  },
  ({ "jcr:title": title }) => (
    <Layout title={title}>
      <Area name="main" />
    </Layout>
  ),
);
