import { buildModuleFileUrl, Island, jahiaComponent } from "@jahia/javascript-modules-library";
import Foo from "./foo.client.tsx";
import { Layout } from "./Layout.tsx";
import vite from "./vite.png";

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
