import { jahiaComponent } from "@jahia/javascript-modules-library";
import classes from "./component.module.css";

jahiaComponent(
  {
    nodeType: "$MODULE:helloCard",
    componentType: "view",
  },
  ({ title, description }) => (
    <article className={classes.card}>
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  ),
);
