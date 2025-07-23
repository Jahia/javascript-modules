import { createElement, type JSX } from "react";
import server from "virtual:jahia-server";
import { useServerContext } from "../hooks/useServerContext.js";

/**
 * Generates an area in which editors may insert content objects.
 *
 * @returns The Area component
 */
export function Area({
  name,
  view,
  allowedNodeTypes,
  numberOfItems,
  readOnly = false,
  nodeType = "jnt:contentList",
  parameters,
}: Readonly<{
  /** The name of the area. */
  name: string;

  /** The view to use for the area. */
  view?: string;
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

  areaType?: string;
  /**
   * Node type to be used to create the area (if the node does not exist yet)
   *
   * @default jnt:contentList
   */
  nodeType?: string;
  /** Map of custom parameters that can be passed to the backend engine for advanced logic. */
  parameters?: Record<string, unknown>;
}>): JSX.Element {
  const { renderContext } = useServerContext();
  return createElement("jsm-raw-html", {
    dangerouslySetInnerHTML: {
      __html: server.render.renderArea(
        {
          name,
          view,
          allowedNodeTypes,
          numberOfItems,
          nodeType,
          editable: !readOnly,
          parameters,
        },
        renderContext,
      ),
    },
  });
}
