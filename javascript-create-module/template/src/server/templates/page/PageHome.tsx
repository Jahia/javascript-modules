import {
  AddResources,
  Area,
  jahiaComponent,
  useUrlBuilder,
} from "@jahia/javascript-modules-library";
import { useTranslation } from "react-i18next";
import "modern-normalize/modern-normalize.css";

jahiaComponent(
  {
    nodeType: "jnt:page",
    name: "home",
    displayName: "Home page",
    componentType: "template",
  },

  (_, { currentResource, renderContext }) => {
    const { t } = useTranslation();
    const { buildStaticUrl } = useUrlBuilder();
    const lang = currentResource.getLocale().getLanguage();
    const editMode = renderContext.isEditMode();
    return (
      <html lang={lang}>
        <head>
          <AddResources
            type="css"
            resources={buildStaticUrl({ assetPath: "../dist/server/style.css" })}
          />
          <title>Home</title>
        </head>
        <body>
          {/* Using i18next defined in locales */}
          {editMode && <div>This is PageBuilder</div>}
          <Area name="pagecontent" />
        </body>
      </html>
    );
  },
);
