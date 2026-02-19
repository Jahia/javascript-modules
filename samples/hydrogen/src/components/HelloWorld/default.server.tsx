import {
  buildModuleFileUrl,
  Island,
  jahiaComponent,
  RenderChildren,
} from "@jahia/javascript-modules-library";
import { Trans, useTranslation } from "react-i18next";
import Celebrate from "./Celebrate.client.jsx";
import classes from "./component.module.css";

jahiaComponent(
  {
    nodeType: "hydrogen:helloWorld",
    displayName: "Hello World Component",
    componentType: "view",
  },
  ({ name }: { name: string }, { renderContext }) => {
    // IMPORTANT: Always use useTranslation() (not { t } from "i18next") in React components.
    // This ensures translations are context-aware, update on language/namespace changes,
    // and avoid hydration mismatches between server and client.
    const { t } = useTranslation();
    return (
      <>
        <section className={classes.section}>
          <header className={classes.header}>
            <h2>
              <Trans
                i18nKey="Mbvdf2LrCB5sW9PUFXO48"
                values={{ name }}
                components={{ mark: <mark /> }}
              />
            </h2>
            {renderContext.isEditMode() && (
              <div className={classes.hint} style={{ alignItems: "center" }}>
                <img
                  src={buildModuleFileUrl("static/arrows/left.svg")}
                  alt="←"
                  width="80"
                  height="16"
                />{" "}
                {t("0U2mp51dWjqWXje4x-eUV")}
              </div>
            )}
          </header>
          <p>{t("7l9zetMbU4cKpL4NxSOtL")}</p>
          <div className={classes.grid}>
            <RenderChildren />
          </div>

          <p className={classes.attribution}>
            <Trans
              i18nKey="8S0DVCRSnmQRKF9lZnNGj"
              components={{ a: <a href="https://undraw.co/" /> }}
            />
          </p>
          <p>{t("OfBsezopuIko8aJ6X3kpw")}</p>
          <Island component={Celebrate} />
          <p>
            <Trans
              i18nKey="nr31fYHB-RqO06BCl4rYO"
              components={{ a: <a href="https://jasonformat.com/islands-architecture/" /> }}
            />
          </p>
        </section>
        {renderContext.isEditMode() && (
          <div className={classes.hint} style={{ marginLeft: "calc(50% - 0.5rem)" }}>
            <img
              src={buildModuleFileUrl("static/arrows/down.svg")}
              alt="↓"
              width="70"
              height="100"
            />{" "}
            {t("89D3xFLMZmCAencaqw68C")}
          </div>
        )}
      </>
    );
  },
);
