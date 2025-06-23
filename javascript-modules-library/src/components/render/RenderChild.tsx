import type { JSX } from "react";
import { Render } from "./Render.js";
import { useServerContext } from "../../hooks/useServerContext.js";
import { AddContentButtons } from "../AddContentButtons.js";

/**
 * Renders a child of the current node, designated by its name.
 *
 * If the child node does not exist, it will display the "Add content" buttons.
 */
export function RenderChild({
  name,
  view,
  nodeTypes,
}: {
  /**
   * The name of the child node to render.
   *
   * In the CND file, it's what's after the `+` in the child node definition: `+ name (type)`.
   */
  name: string;
  /** View to use when rendering the child. */
  view?: string | undefined;
  /** The node types to add, forwarded to <AddContentButtons />. */
  nodeTypes?: string[];
}): JSX.Element {
  const { currentNode } = useServerContext();
  if (currentNode.hasNode(name)) {
    return <Render node={currentNode.getNode(name)} view={view} />;
  }
  return <AddContentButtons childName={name} nodeTypes={nodeTypes} />;
}
