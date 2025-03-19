import {
  AddResources,
  useServerContext,
  urlFromModuleFile,
} from "@jahia/javascript-modules-library";
import type { ReactNode } from "react";

import "modern-normalize/modern-normalize.css";
import "./global.css";

/** Places `children` in an html page. */
export const Layout = ({ title, children }: { title: string; children: ReactNode }) => {
  const { currentResource } = useServerContext();
  const lang = currentResource.getLocale().getLanguage();
  return (
    <html lang={lang}>
      <head>
        <AddResources type="css" resources={urlFromModuleFile("dist/server/style.css")} />
        <title>{title}</title>
      </head>
      <body>{children}</body>
    </html>
  );
};
