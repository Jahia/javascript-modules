import { jahiaComponent, urlFromModuleFile } from "@jahia/javascript-modules-library";
import classes from "./component.module.css";

jahiaComponent(
  {
    nodeType: "$MODULE:helloCard",
    componentType: "view",
  },
  ({ illustration, title }: { illustration: string; title: string }) => {
    return (
      <article className={classes.card}>
        <img src={urlFromModuleFile(`static/illustrations/${illustration}.svg`)} alt="" />
        <p>{title}</p>
      </article>
    );
  },
);
