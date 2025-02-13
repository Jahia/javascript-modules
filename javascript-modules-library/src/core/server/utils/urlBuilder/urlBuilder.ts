import type { RenderContext, Resource } from "org.jahia.services.render";
import { getNodeFromPathOrId } from "../jcr/getNodeFromPathOrId.js";
import { server } from "@jahia/javascript-modules-library-private";
import type { JCRNodeWrapper } from "org.jahia.services.content";

const absoluteUrlRegExp = /^(?:[a-z+]+:)?\/\//i;

const finalizeUrl = (url: string, renderContext: RenderContext) => {
  if (!absoluteUrlRegExp.test(url)) {
    url = url.startsWith("/") ? renderContext.getRequest().getContextPath() + url : url;
    // @ts-expect-error The types are wrong here! TODO: Fix the types
    return renderContext.getResponse().encodeURL(url);
  }

  return url;
};

function appendParameters(url: string, parameters: Record<string, string>) {
  const separator = url.includes("?") ? "&" : "?";
  const URLParameters = Object.keys(parameters)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(parameters[key])}`)
    .join("&");

  return `${url}${separator}${URLParameters}`;
}

/** Initialize the registry with default url builders */
export function initUrlBuilder(): void {
  server.registry.add("urlBuilder", "nt:file", {
    priority: 1,
    buildURL: ({
      jcrNode,
      mode,
      currentResource,
    }: {
      jcrNode: JCRNodeWrapper;
      mode: string;
      currentResource: Resource;
    }) => {
      const workspace = mode
        ? mode === "edit" || mode === "preview"
          ? "default"
          : "live"
        : currentResource.getWorkspace();
      return "/files/" + workspace + server.render.escapePath(jcrNode.getCanonicalPath());
    },
  });
  server.registry.add("urlBuilder", "*", {
    priority: 0,
    buildURL: ({
      jcrNode,
      mode,
      language,
      extension,
      renderContext,
      currentResource,
    }: {
      jcrNode: JCRNodeWrapper;
      mode: string;
      language: string;
      extension: string;
      renderContext: RenderContext;
      currentResource: Resource;
    }) => {
      let workspace: string;
      let servletPath: string;
      if (mode) {
        switch (mode) {
          case "edit":
            servletPath = "/cms/edit";
            workspace = "default";
            break;
          case "preview":
            servletPath = "/cms/render";
            workspace = "default";
            break;
          default:
            servletPath = "/cms/render";
            workspace = "live";
            break;
        }
      } else {
        servletPath = renderContext.getServletPath();
        workspace = currentResource.getWorkspace();
      }

      return (
        servletPath +
        "/" +
        workspace +
        "/" +
        (language ? language : currentResource.getLocale().toString()) +
        server.render.escapePath(jcrNode.getPath()) +
        (extension ? extension : ".html")
      );
    },
  });
}

/**
 * Provide URL generation for contents/files If parameters are not valid, or if a node couldn't be
 * found, it will log an warning and return '#'
 *
 * @param renderContext The current renderContext
 * @param currentResource The current resource
 * @returns The final URL
 */
export function buildUrl(
  props: {
    /** The path of the resource to build the URL for */
    value?: string;
    /** The path of the resource to build the URL for */
    path?: string;
    /** The parameters to append to the URL */
    parameters?: Record<string, string>;
    /** The mode to use to build the URL */
    mode?: string;
    /** The language to use to build the URL */
    language?: string;
    /** The extension to use to build the URL */
    extension?: string;
  },
  renderContext: RenderContext,
  currentResource: Resource,
): string {
  let url: string | undefined;
  if (props.path) {
    let jcrNode: JCRNodeWrapper | null;
    try {
      jcrNode = getNodeFromPathOrId({ path: props.path }, currentResource.getNode().getSession());
    } catch {
      console.warn(`Unable to find node for path: ${props.path}\n Replacing by #`);
      return "#";
    }

    if (jcrNode) {
      const urlBuilders = server.registry.find({ type: "urlBuilder" }, "priority");
      for (const urlBuilder of urlBuilders) {
        if (urlBuilder.key === "*" || jcrNode.isNodeType(urlBuilder.key)) {
          url = urlBuilder.buildURL({
            jcrNode,
            mode: props.mode,
            language: props.language,
            extension: props.extension,
            renderContext,
            currentResource,
          });
          break;
        }
      }
    }
  } else if (props.value) {
    url = props.value;
  } else {
    console.warn(
      "Missing parameter to build url, please provide either a content path using 'path' parameter, " +
        "or a prebuild valid url using 'value' parameter\n replacing by #",
    );
    return "#";
  }

  if (url) {
    // Handle parameters
    if (
      props.parameters &&
      Object.prototype.toString.call(props.parameters) === "[object Object]"
    ) {
      url = appendParameters(url, props.parameters);
    }

    // Finalize URL (add context, encodeURL)
    return finalizeUrl(url, renderContext);
  }

  console.warn(`Unable to build url for: ${JSON.stringify(props)}\n Replacing by #`);
  return "#";
}
