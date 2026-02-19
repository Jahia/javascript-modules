import { buildNodeUrl, getSiteLocales, jahiaComponent } from "@jahia/javascript-modules-library";
import { Fragment } from "react";
import classes from "./component.module.css";
import { useTranslation } from "react-i18next";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "hydrogen:languageSwitcher",
    displayName: "Language Switcher",
    // Disable cache for this component
    properties: { "cache.timeout": "0" },
  },
  (_, { mainNode, currentResource }) => {
    // IMPORTANT: Always use useTranslation() (not { t } from "i18next") in React components.
    // This ensures translations are context-aware, update on language/namespace changes,
    // and avoid hydration mismatches between server and client.
    const { t } = useTranslation();
    const currentLanguage = currentResource.getLocale().toString();
    return (
      <p style={{ textAlign: "center" }}>
        {t("JI87mYV8J5pAEST4RIUcb")}{" "}
        {Object.entries(getSiteLocales()).map(([language, locale], i, { length }) => {
          const href = buildNodeUrl(mainNode, { language });
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
