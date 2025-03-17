import type { JSX } from "react";
import { useServerContext } from "../hooks/useServerContext.js";
import server from "virtual:jahia-server";

/**
 * Generates an area in which editors may insert content objects.
 *
 * @returns The Area component
 */
export function Area({
  name,
  areaView,
  allowedTypes,
  numberOfItems,
  subNodesView,
  path,
  readOnly = false,
  areaAsSubNode,
  areaType = "jnt:contentList",
  parameters,
}: Readonly<{
  /** The name of the area. */
  name?: string;
  /** The view to use for the area. */
  areaView?: string;
  /** The allowed types for the area. */
  allowedTypes?: string[];
  /** The number of items to display in the area. */
  numberOfItems?: number;
  /** The view to use for the subnodes. */
  subNodesView?: string;
  /** Relative (to the current node) or absolute path to the node to include. */
  path?: string;
  /**
   * Makes the area read-only.
   *
   * @default false
   */
  readOnly?: boolean;
  /**
   * Allow area to be stored as a subnode
   *
   * @deprecated Use child node(s) and `<RenderChild(ren) />` instead
   */
  areaAsSubNode?: boolean;
  /**
   * Content type to be used to create the area
   *
   * @default jnt:contentList
   */
  areaType?: string;
  /** The parameters to pass to the area */
  parameters?: Record<string, unknown>;
}>): JSX.Element {
  const { renderContext } = useServerContext();
  return (
    // @ts-expect-error <unwanteddiv> is not a valid HTML element
    <unwanteddiv
      dangerouslySetInnerHTML={{
        __html: server.render.renderArea(
          {
            name,
            areaView,
            allowedTypes,
            numberOfItems,
            subNodesView,
            path,
            editable: !readOnly,
            areaAsSubNode,
            areaType,
            parameters,
          },
          renderContext,
        ),
      }}
    />
  );
}
