import type { JCRNodeWrapper } from "org.jahia.services.content";
import type React from "react";
import { createElement } from "react";
import { useServerContext } from "../../hooks/useServerContext.js";

export interface VirtualJCRNode {
  /**
   * The parent node path.
   *
   * @default "/"
   */
  parent?: string;

  /** Name of the node to render. Used as an identifier by the rendering process. */
  name: string;

  /** Primary node type for the virtual node, e.g. `jnt:bigText`. */
  nodeType: string;

  /** Additional mixin types for the virtual node. */
  mixins?: string | string[];

  /** Properties of the virtual node. */
  properties?: Record<string, unknown>;

  /**
   * Internationalized (i18n) properties of the virtual node.
   *
   * The keys of the outer record are the locale codes (e.g. "en", "fr", ...), and the values are
   * records mapping property names to their localized values.
   *
   * @example
   *   {
   *     "en": { "title": "Hello" },
   *     "fr": { "title": "Bonjour" }
   *   }
   */
  i18nProperties?: Record<string, Record<string, unknown> | undefined>;

  /**
   * If the virtual node is meant to be [bound to a specific component][0], this is the relative
   * path to that component, in regards to the main resource being rendered.
   *
   * This only makes sense if `nodeType` inherits from `jmix:bindedComponent` (or it was directly
   * provided in `mixins`)
   *
   * [0]: https://academy.jahia.com/documentation/jahia-cms/jahia-8.2/developer/java-module-development/understanding-jahia-modules#boundcomponents
   */
  boundComponentRelativePath?: string;

  /** Children of the virtual node, virtual nodes themselves. */
  children?: VirtualJCRNode[];
}

/**
 * Render a content node directly from a JCR node.
 *
 * @returns The rendered output of the view for the specified content
 */
export function Render(
  props: Readonly<{
    /** The node to render. */
    node: JCRNodeWrapper;
    /**
     * Makes the child read-only.
     *
     * @default false
     */
    readOnly?: boolean;
    advanceRenderingConfig?: "OPTION";
    /** The template type to use (html, json, ...) */
    templateType?: string;
    /** The name of the view variant to use */
    view?: string;
    /** The parameters to pass to the view */
    parameters?: Record<string, unknown>;
  }>,
): React.JSX.Element;

/**
 * Render a content node from its path.
 *
 * @returns The rendered output of the view for the specified content
 */
export function Render(
  props: Readonly<{
    /** The path node to render. If relative, it will be resolved against the current resource. */
    path: string;
    /**
     * Makes the child read-only.
     *
     * @default false
     */
    readOnly?: boolean;
    advanceRenderingConfig?: "OPTION";
    /** The template type to use (html, json, ...) */
    templateType?: string;
    /** The name of the view variant to use */
    view?: string;
    /** The parameters to pass to the view */
    parameters?: Record<string, unknown>;
  }>,
): React.JSX.Element;

/**
 * Render a virtual content node.
 *
 * @returns The rendered output of the view for the specified content
 */
export function Render(
  props: Readonly<{
    /** The content node to render */
    content: VirtualJCRNode;
    /**
     * Makes the child read-only.
     *
     * @default false
     */
    readOnly?: boolean;
    advanceRenderingConfig?: "OPTION";
    /** The template type to use (html, json, ...) */
    templateType?: string;
    /** The name of the view variant to use */
    view?: string;
    /** The parameters to pass to the view */
    parameters?: Record<string, unknown>;
  }>,
): React.JSX.Element;

/**
 * Render the current content node, in read only mode.
 *
 * @returns The rendered output of the view for the specified content
 */
export function Render(
  props: Readonly<{
    advanceRenderingConfig: "INCLUDE";
    /** The template type to use (html, json, ...) */
    templateType?: string;
    /** The name of the view variant to use */
    view?: string;
    /** The parameters to pass to the view */
    parameters?: Record<string, unknown>;
  }>,
): React.JSX.Element;

// Implementation, all overloads merged as one signature with optional params
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
  content?: VirtualJCRNode;
  node?: JCRNodeWrapper;
  path?: string;
  readOnly?: boolean;
  advanceRenderingConfig?: "INCLUDE" | "OPTION";
  templateType?: string;
  view?: string;
  parameters?: Record<string, unknown>;
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
