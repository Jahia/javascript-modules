import {
  AddContentButtons,
  getChildNodes,
  HydrateInBrowser,
  jahiaComponent,
  Render,
} from "@jahia/javascript-modules-library";
import classes from "./component.module.css";
import SampleClientComponent from "./Celebrate.client.jsx";
import { BottomArrow, LeftArrow } from "./arrows.jsx";
import { Trans } from "react-i18next";
import { t } from "i18next";

jahiaComponent(
  {
    nodeType: "$MODULE:HelloWorld",
    displayName: "Hello World Component",
    componentType: "view",
  },
  ({ name }: { name: string }, { renderContext, currentNode }) => (
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
              <LeftArrow /> {t("0U2mp51dWjqWXje4x-eUV")}
            </div>
          )}
        </header>
        <p>{t("7l9zetMbU4cKpL4NxSOtL")}</p>
        <div className={classes.grid}>
          {getChildNodes(currentNode, -1, 0, (node) => node.isNodeType("jnt:content")).map(
            (node) => (
              // @ts-expect-error Fix the types
              <Render key={node.getIdentifier()} node={node} />
            ),
          )}
          <AddContentButtons />
        </div>

        <p className={classes.attribution}>
          <Trans
            i18nKey="8S0DVCRSnmQRKF9lZnNGj"
            components={{ a: <a href="https://undraw.co/" /> }}
          />
        </p>
        <p>{t("OfBsezopuIko8aJ6X3kpw")}</p>
        <HydrateInBrowser child={SampleClientComponent} />
        <p>
          <Trans
            i18nKey="nr31fYHB-RqO06BCl4rYO"
            components={{ a: <a href="https://jasonformat.com/islands-architecture/" /> }}
          />
        </p>
      </section>
      {renderContext.isEditMode() && (
        <div className={classes.hint} style={{ marginLeft: "calc(50% - 0.5rem)" }}>
          <BottomArrow /> {t("89D3xFLMZmCAencaqw68C")}
        </div>
      )}
    </>
  ),
);
