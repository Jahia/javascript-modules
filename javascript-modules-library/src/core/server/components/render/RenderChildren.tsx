import type { JSX } from "react";
import { Render } from "./Render.js";
import { useServerContext } from "../../hooks/useServerContext.js";
import { AddContentButtons } from "../AddContentButtons.js";
import { getChildNodes } from "../../utils/jcr/getChildNodes.js";
import type { JCRNodeWrapper } from "org.jahia.services.content";

/** Renders the children of the current node, and "Add content" buttons afterwards. */
export function RenderChildren({
  view,
  pagination,
  filter = "jnt:content",
}: {
  /** View to use when rendering the children. */
  view?: string | undefined;
  /**
   * Pagination parameters:
   *
   * - `{ count: number; start?: number }` to specify the number of children to display and the
   *   starting index (defaults to 0).
   * - `{ count: number; page: number }` to specify the number of children to display and the page
   *   number.
   *
   * If not provided, all children will be displayed.
   */
  pagination?: { count: number; start?: number } | { count: number; page: number };
  /**
   * Filter to apply to the children:
   *
   * - A string to filter by node type.
   * - A function to filter by custom logic.
   *
   * @default "jnt:content"
   */
  filter?: string | ((node: JCRNodeWrapper) => boolean);
}): JSX.Element {
  const { currentNode } = useServerContext();
  const offset = pagination
    ? "page" in pagination
      ? pagination.page * pagination.count
      : (pagination.start ?? 0)
    : 0;
  const limit = pagination ? pagination.count : -1;

  return (
    <>
      {getChildNodes(
        currentNode,
        limit,
        offset,
        typeof filter === "string" ? (node) => node.isNodeType(filter) : filter,
      ).map((node) => (
        <Render key={node.getIdentifier()} node={node} view={view} />
      ))}
      <AddContentButtons />
    </>
  );
}
