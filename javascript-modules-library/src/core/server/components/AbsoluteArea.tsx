import type React from "react";
import { useServerContext } from "../hooks/useServerContext.js";
import server from "virtual:jahia-server";
import type { JCRNodeWrapper } from "org.jahia.services.content";

/**
 * Generates an absolute area in which editors may insert content objects.
 *
 * @returns The AbsoluteArea component
 */
export function AbsoluteArea({
  name,
  parent,
  areaView,
  view,
  allowedTypes,
  allowedNodeTypes,
  numberOfItems,
  readOnly = false,
  areaType = "jnt:contentList",
  nodeType = "jnt:contentList",
  parameters,
}: Readonly<{
  /** The name of the area. */
  name: string;
  /** Parent node where the area is stored in the JCR. The parent node must exist. */
  parent: JCRNodeWrapper;

  /**
   * The view to use for the area.
   *
   * @deprecated Use {@link #view} instead
   */
  areaView?: string;
  /** The view to use for the area. */
  view?: string;
  /**
   * The allowed types for the area.
   *
   * @deprecated Use {@link #allowedNodeTypes} instead
   */
  allowedTypes?: string[];
  /** The allowed types for the area. */
  allowedNodeTypes?: string[];
  /** The number of items to display in the area. */
  numberOfItems?: number;

  /**
   * Makes the area read-only.
   *
   * - When set to `false` (default), the area is editable on all pages.
   * - When set to `true`, the area is read-only on all pages.
   * - When set to `"children"`, the area is read-only on all pages except the one containing its
   *   node.
   *
   * @default false
   */
  readOnly?: boolean | "children";
  /**
   * Content node type to be used to create the area (if the node does not exist yet)
   *
   * @deprecated Use {@link #nodeType} instead
   * @default jnt:contentList
   */
  areaType?: string;
  /**
   * Content node type to be used to create the area (if the node does not exist yet)
   *
   * @default jnt:contentList
   */
  nodeType?: string;
  /**
   * Map of custom parameters that can be passed to the backend engine for advanced logic.
   *
   * @deprecated Not recommended
   */
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
            parent: parent,
            view: view ? view : areaView,
            allowedNodeTypes: allowedNodeTypes ?? allowedTypes,
            numberOfItems,
            nodeType: nodeType ?? areaType,
            editable: readOnly !== true,
            limitedAbsoluteAreaEdit: readOnly === "children",
            parameters,
          },
          renderContext,
        ),
      }}
    />
  );
}
