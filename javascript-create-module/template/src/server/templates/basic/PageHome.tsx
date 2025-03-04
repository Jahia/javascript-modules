import { Area, jahiaComponent } from "@jahia/javascript-modules-library";
import "modern-normalize/modern-normalize.css";
import { Layout } from "$server/templates/Layout.jsx";

jahiaComponent(
  {
    nodeType: "jnt:page",
    name: "home",
    displayName: "Home page",
    componentType: "template",
  },
  ({ "jcr:title": title }) => (
    <Layout title={title}>
      <Area name="contents" />
    </Layout>
  ),
);
