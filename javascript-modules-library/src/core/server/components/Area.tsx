import type { JSX } from "react";
import { useServerContext } from "../hooks/useServerContext.js";
import { server } from "@jahia/javascript-modules-library-private";

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
  editable = true,
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
   * Enables or disables edition of this content in edit mode. Mainly used for absolute or
   * references.
   *
   * @default true
   */
  editable?: boolean;
  /** Allow area to be stored as a subnode */
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
            editable,
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
