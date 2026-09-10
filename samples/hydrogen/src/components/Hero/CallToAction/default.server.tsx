import { jahiaComponent, JLink } from "@jahia/javascript-modules-library";
import classes from "./component.module.css";

type Props = {
  "title": string;
  /** Only set on an external link, where it is the tooltip of the anchor. */
  "j:linkTitle"?: string;
};

jahiaComponent(
  {
    componentType: "view",
    nodeType: "hydrogen:heroCallToAction",
    displayName: "Call To Action",
  },
  (props: Props, { currentNode }) => (
    // `content` reads j:linkType, j:linknode and j:url off the node, so there is no switch to
    // write. A reference that does not resolve — a page that is not published yet — renders the
    // title without an anchor instead of breaking the section.
    <JLink
      content={currentNode}
      title={props["j:linkTitle"]}
      className={classes.cta}
      whenUnresolved="children"
    >
      {props.title}
    </JLink>
  ),
);
