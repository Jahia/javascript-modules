import { jahiaComponent, useUrlBuilder } from "@jahia/javascript-modules-library";
import classes from "./component.module.css";

jahiaComponent(
  {
    nodeType: "$MODULE:HelloCard",
    componentType: "view",
  },
  ({ illustration, title, description }) => {
    const { buildStaticUrl } = useUrlBuilder();
    return (
      <article className={classes.card}>
        <img src={buildStaticUrl({ assetPath: `illustrations/${illustration}.svg` })} alt="" />
        <h3>{title}</h3>
        <p>{description}</p>
      </article>
    );
  },
);
