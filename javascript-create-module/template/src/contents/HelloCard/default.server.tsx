import { jahiaComponent, useUrlBuilder } from "@jahia/javascript-modules-library";
import classes from "./component.module.css";

jahiaComponent(
  {
    nodeType: "$MODULE:HelloCard",
    componentType: "view",
  },
  ({ illustration, title }) => {
    const { buildStaticUrl } = useUrlBuilder();
    return (
      <article className={classes.card}>
        <img src={buildStaticUrl({ assetPath: `illustrations/${illustration}.svg` })} alt="" />
        <p>{title}</p>
      </article>
    );
  },
);
