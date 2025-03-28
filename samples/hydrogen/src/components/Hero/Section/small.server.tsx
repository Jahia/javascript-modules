import { buildNodeUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import classes from "./component.module.css";
import type { Props } from "./types.js";

export const SmallHeroSection = jahiaComponent(
  {
    componentType: "view",
    nodeType: "hydrogen:heroSection",
    displayName: "Small Hero Section",
    name: "small",
  },
  ({ title, subtitle, background }: Props) => (
    <header
      className={[classes.hero, classes.small].join(" ")}
      style={{ backgroundImage: `url(${buildNodeUrl(background)})` }}
    >
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </header>
  ),
);
