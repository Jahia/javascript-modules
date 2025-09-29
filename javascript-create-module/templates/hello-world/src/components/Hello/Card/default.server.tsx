import { buildModuleFileUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import classes from "./styles.module.css";

/**
 * Leverage Vite's glob imports to get all illustrations
 *
 * @see https://vite.dev/guide/features.html#glob-import
 */
const illustrations = import.meta.glob<string>("./illustrations/*.svg", {
  eager: true,
  import: "default",
});

interface Props {
  "illustration": string;
  "jcr:title": string;
}

jahiaComponent(
  {
    componentType: "view",
    nodeType: "$NAMESPACE:helloCard",
  },
  ({ illustration, "jcr:title": title }: Props) => (
    <article className={classes.card}>
      <img src={buildModuleFileUrl(illustrations[`./illustrations/${illustration}.svg`])} alt="" />
      <p>{title}</p>
    </article>
  ),
);
