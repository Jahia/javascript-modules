import type { JCRNodeWrapper } from "org.jahia.services.content";
import type React from "react";
import { createElement } from "react";
import { useServerContext } from "../../hooks/useServerContext.js";

/**
 * Render a content node
 *
 * @returns The rendered output of the view for the specified content
 */
export function Render({
  content,
  node,
  path,
  readOnly = false,
  advanceRenderingConfig,
  templateType,
  view,
  parameters,
}: Readonly<{
  /** The content node to render */
  content?: unknown;
  /** The node to render */
  node?: JCRNodeWrapper;
  /** The path to render */
  path?: string;
  /**
   * Makes the child read-only.
   *
   * @default false
   */
  readOnly?: boolean;
  /**
   * Specifies if we should render a node or simply include a view. Acceptable values are : none,
   * INCLUDE or OPTION
   */
  advanceRenderingConfig?: "INCLUDE" | "OPTION";
  /** The template type to use (html, json, ...) */
  templateType?: string;
  /** The name of the view variant to use */
  view?: string;
  /** The parameters to pass to the view */
  parameters?: unknown;
}>): React.JSX.Element {
  const { renderContext, currentResource } = useServerContext();
  return createElement("jsm-raw-html", {
    dangerouslySetInnerHTML: {
      __html: server.render.render(
        {
          content,
          node,
          path,
          editable: !readOnly,
          advanceRenderingConfig,
          templateType,
          view,
          parameters,
        },
        renderContext,
        currentResource,
      ),
    },
  });
}
