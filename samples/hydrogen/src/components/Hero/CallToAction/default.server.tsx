import { buildNodeUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import classes from "./component.module.css";

type Props = {
  title: string;
} & ( // Reflect the three possible values of j:linkType
  | { "j:linkType": "none" }
  | { "j:linkType": "external"; "j:url": string; "j:linkTitle": string }
  | { "j:linkType": "internal"; "j:linknode": JCRNodeWrapper }
);

jahiaComponent(
  {
    componentType: "view",
    nodeType: "hydrogen:heroCallToAction",
    displayName: "Call To Action",
  },
  (props: Props) => {
    switch (props["j:linkType"]) {
      case "external":
        return (
          <a href={props["j:url"]} title={props["j:linkTitle"]} className={classes.cta}>
            {props.title}
          </a>
        );

      case "internal":
        return (
          <a href={buildNodeUrl(props["j:linknode"])} className={classes.cta}>
            {props.title}
          </a>
        );

      case "none":
        return <s>{props.title}</s>;
    }
  },
);
