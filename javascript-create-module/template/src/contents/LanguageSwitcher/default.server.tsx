import { buildUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import { Fragment } from "react";
import classes from "./component.module.css";
import { t } from "i18next";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "$MODULE:LanguageSwitcher",
    displayName: "Language Switcher",
    // Disable cache for this component
    properties: { "cache.timeout": "0" },
  },
  (_, { renderContext, mainNode, currentResource }) => {
    const locales = renderContext.isLiveMode()
      ? renderContext.getSite().getActiveLiveLanguagesAsLocales()
      : renderContext.getSite().getLanguagesAsLocales();
    const currentLanguage = currentResource.getLocale().getLanguage();
    return (
      <p style={{ textAlign: "center" }}>
        {t("JI87mYV8J5pAEST4RIUcb")}{" "}
        {locales.map((locale, i) => {
          const language = locale.getLanguage();
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
              {i < locales.length - 1 && " • "}
            </Fragment>
          );
        })}
      </p>
    );
  },
);
