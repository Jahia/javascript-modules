import { buildUrl, getSiteLocales, jahiaComponent } from "@jahia/javascript-modules-library";
import { t } from "i18next";
import { Fragment } from "react";
import classes from "./component.module.css";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "$MODULE:languageSwitcher",
    displayName: "Language Switcher",
    // Disable cache for this component
    properties: { "cache.timeout": "0" },
  },
  (_, { renderContext, mainNode, currentResource }) => {
    const currentLanguage = currentResource.getLocale().toString();
    return (
      <p style={{ textAlign: "center" }}>
        {t("JI87mYV8J5pAEST4RIUcb")}{" "}
        {Object.entries(getSiteLocales()).map(([language, locale], i, { length }) => {
          const href = buildUrl(
            { path: mainNode.getPath(), language },
            renderContext,
            currentResource,
          );
          return (
            <Fragment key={language}>
              <a
                href={href}
                className={classes.a}
                aria-current={language === currentLanguage ? "page" : undefined}
              >
                {locale.getDisplayLanguage(locale)}
              </a>
              {i < length - 1 && " • "}
            </Fragment>
          );
        })}
      </p>
    );
  },
);
