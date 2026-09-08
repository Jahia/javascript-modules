import type { JCRNodeWrapper } from "org.jahia.services.content";
import { createElement, type JSX } from "react";
import { useServerContext } from "../hooks/useServerContext.js";

/**
 * Generates an area in which editors may insert content objects.
 *
 * @returns The Area component
 */
export function Area({
  name,
  parent,
  view,
  allowedNodeTypes,
  numberOfItems,
  readOnly = false,
  nodeType = "jnt:contentList",
  parameters,
}: Readonly<{
  /** The name of the area. */
  name: string;

  /**
   * Optional parent node where the area is stored in the JCR. When provided, the area is stored
   * as a child of this node (i.e. at `<parent path>/<name>`), and the node is resolved directly
   * by its absolute JCR path. The parent node must already exist.
   *
   * When omitted, the area is stored as a child of the current page node and resolved using the
   * standard template-inheritance hierarchy (default behavior).
   */
  parent?: JCRNodeWrapper;

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
          parent,
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
