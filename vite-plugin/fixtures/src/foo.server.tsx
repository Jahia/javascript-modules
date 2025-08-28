import { buildModuleFileUrl, Island, jahiaComponent } from "@jahia/javascript-modules-library";
import vite from "./vite.png";
import { Layout } from "./Layout.tsx";
import Foo from "./foo.client.tsx";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "fixtures:foo",
  },
  () => (
    <Layout>
      <img src={buildModuleFileUrl(vite)} alt="Vite logo" />
      <Island component={Foo} />
    </Layout>
  ),
);
