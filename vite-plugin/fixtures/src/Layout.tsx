import { AddResources, buildModuleFileUrl } from "@jahia/javascript-modules-library";
import "modern-normalize";

export const Layout = ({ children }: { children: React.ReactNode }) => (
  <body>
    {children}
    <AddResources type="css" resources={buildModuleFileUrl("dist/assets/style.css")} />
  </body>
);
