import { getChildNodes, jahiaComponent, JLink } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import classes from "./component.module.css";

/** Get all child pages of a node. */
const getChildPages = (node: JCRNodeWrapper) =>
  getChildNodes(node, -1, 0, (node) => node.isNodeType("jnt:page"));

jahiaComponent(
  {
    componentType: "view",
    nodeType: "hydrogen:navBar",
    displayName: "NavBar",
    // JLink emits aria-current on the page being rendered, which is not part of the fragment
    // cache key unless the view says so. Without this the nav would be cached once and replayed,
    // marking the same entry current on every page.
    properties: { "cache.mainResource": "true" },
  },
  (_, { renderContext }) => (
    <nav className={classes.nav}>
      <ul>
        {getChildPages(renderContext.getSite()).map((page) => (
          <li key={page.getPath()}>
            {/* No children: the label comes from the page itself */}
            <JLink node={page} />
            <ul>
              {getChildPages(page).map((page) => (
                <li key={page.getPath()}>
                  <JLink node={page} />
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  ),
);
