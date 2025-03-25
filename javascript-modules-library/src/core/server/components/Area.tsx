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
   * @default false
   */
  readOnly?: boolean;

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
}>): JSX.Element {
  const { renderContext } = useServerContext();
  return (
    // @ts-expect-error <unwanteddiv> is not a valid HTML element
    <unwanteddiv
      dangerouslySetInnerHTML={{
        __html: server.render.renderArea(
          {
            name,
            view: view ?? areaView,
            allowedNodeTypes: allowedNodeTypes ?? allowedTypes,
            numberOfItems,
            nodeType: nodeType ?? areaType,
            editable: !readOnly,
            parameters,
          },
          renderContext,
        ),
      }}
    />
  );
}
