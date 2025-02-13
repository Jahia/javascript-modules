import React from "react";
import { server } from "@jahia/javascript-modules-library-private";
import { useServerContext } from "../../hooks/useServerContext.js";
import type { JCRNodeWrapper } from "org.jahia.services.content";

/**
 * Render a content node
 *
 * @returns The rendered output of the view for the specified content
 */
export function Render({
  content,
  node,
  path,
  editable = true,
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
   * If the content should be editable
   *
   * @default true
   */
  editable?: boolean;
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
  return (
    // @ts-expect-error <unwanteddiv> is not a valid HTML element
    <unwanteddiv
      dangerouslySetInnerHTML={{
        __html: server.render.render(
          {
            content,
            node,
            path,
            editable,
            advanceRenderingConfig,
            templateType,
            view,
            parameters,
          },
          renderContext,
          currentResource,
        ),
      }}
    />
  );
}
