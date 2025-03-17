import type React from "react";
import { useServerContext } from "../hooks/useServerContext.js";
import server from "virtual:jahia-server";

/**
 * Generates an absolute area in which editors may insert content objects.
 *
 * @returns The AbsoluteArea component
 */
export function AbsoluteArea({
  name,
  areaView,
  allowedTypes,
  numberOfItems,
  subNodesView,
  path,
  readOnly = false,
  level,
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
   * - When set to `false` (default), the area is editable on all pages.
   * - When set to `true`, the area is read-only on all pages.
   * - When set to `"children"`, the area is read-only on all pages except the one containing its node.
   *
   * @default false
   */
  readOnly?: boolean | "children"
  /** Ancestor level for absolute area - 0 is Home page, 1 first sub-pages, ... */
  level?: number;
  /**
   * Content type to be used to create the area
   *
   * @default jnt:contentList
   */
  areaType?: string;
  /** The parameters to pass to the absolute area */
  parameters?: Record<string, unknown>;
}>): React.JSX.Element {
  const { renderContext } = useServerContext();
  return (
    // @ts-expect-error <unwanteddiv> is not a valid HTML element
    <unwanteddiv
      dangerouslySetInnerHTML={{
        __html: server.render.renderAbsoluteArea(
          {
            name,
            areaView,
            allowedTypes,
            numberOfItems,
            subNodesView,
            path,
            editable: readOnly !== false,
            level,
            areaType,
            limitedAbsoluteAreaEdit: readOnly === "children",
            parameters,
          },
          renderContext,
        ),
      }}
    />
  );
}
