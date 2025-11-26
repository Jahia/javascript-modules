import { AbsoluteArea, Area, jahiaComponent } from "@jahia/javascript-modules-library";
import { Layout } from "../Layout.jsx";
import { Render } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    componentType: "template",
    nodeType: "jnt:page",
    displayName: "Single column",
    name: "singleColumn",
  },
  ({ "jcr:title": title }, { renderContext }) => (
    <Layout title={title}>
      <Render content={{ name: "navbar", nodeType: "hydrogen:navBar" }} />
      <Area name="header" nodeType="hydrogen:header" />
      <main style={{ maxWidth: "40rem", margin: "0 auto" }}>
        <Area name="main" />
      </main>
      <AbsoluteArea name="footer" parent={renderContext.getSite()} nodeType="hydrogen:footer" />
    </Layout>
  ),
);
