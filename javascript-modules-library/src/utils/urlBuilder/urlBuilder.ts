import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { RenderContext, Resource } from "org.jahia.services.render";
import { useServerContext } from "../../hooks/useServerContext";

// Regex that checks if the first word contains colon (http:, mail:, ftp: ..)
const absoluteUrlRegExp = /^(?:[a-z+]+:)?\/\//i;

/**
 * Generate a Jahia url for the provided node.
 *
 * @returns The final URL
 */
export function buildNodeUrl(
  /** The node to build the URL for */
  node: JCRNodeWrapper,
  config: {
    /** The querystring parameters to append to the URL */
    parameters?: Record<string, string>;
    /**
     * The mode to use to build the URL. Defines the mode or override the one provided by the
     * renderContext.
     */
    mode?: "edit" | "preview" | "live";
    /**
     * The language to use to build the URL. Defines the languages or overrides the one provided by
     * the current resource
     */
    language?: string;
    /**
     * The extension to use to build the URL. Defines the extension or overrides the one provided by
     * the current resource
     */
    extension?: string;
    /** Additional parameters used for building the URL, through `node.getUrl` overloads. */
    decorations?: string[];
  } = {},
  context: {
    /** Provided in react context, but you need to provide one otherwise. * */
    renderContext?: RenderContext;
    /** Provided in react context, you need to provide one otherwise. * */
    currentResource?: Resource;
  } = useServerContext(),
): string {
  if (!node) throw new Error("Expected a node in buildNodeUrl, received undefined");

  // URL building is an old thing in Jahia, with a lot of branches and special cases:
  // - if any of mode, language or extension is provided, we need to build the URL manually
  // - otherwise, we can use node.getUrl() with decorations if provided

  // Manual URL building: concatenate various parts together to get a URL
  // like `<c:url value="${url.base}${node.path}.html" />` in JSP
  if (config.mode || config.language || config.extension) {
    if (config.decorations) {
      throw new Error(
        "You cannot use decorations with mode, language or extension in buildNodeUrl.",
      );
    }

    if (!context.renderContext || !context.currentResource) {
      throw new Error(
        "You cannot use mode, language or extension in buildNodeUrl outside of a RenderContext.",
      );
    }

    const mode = config.mode ?? context.renderContext.getMode();
    const language = config.language ?? context.currentResource?.getLocale().toString();
    const extension = config.extension ?? `.html`;

    return buildEndpointUrl(
      (mode === "edit"
        ? "/cmd/edit/default/"
        : mode === "preview"
          ? "/cmd/render/default/"
          : "/cms/render/live/") +
        language +
        node.getPath() +
        extension,
      { parameters: config.parameters },
      context,
    );
  }

  return buildEndpointUrl(
    config.decorations ? node.getUrl(config.decorations) : node.getUrl(),
    { parameters: config.parameters },
    context,
  );
}

/**
 * Build a URL for a file in a module. Note that to be accessible, the folder that contains the file
 * must be part of the jahia.static-resources in package.json.
 *
 * The URL must not be absolute (start with a /). Url with a protocol (e.g. data: URI) will be
 * returned as is.
 */
export function buildModuleFileUrl(
  /** Relative path of the file from the module's root (examples: css/my.css, images/myImage.webp) */
  filePath: string,
  config: {
    /** Defines a custom module name to access its files */
    moduleName?: string;
    /** Querystring parameters to append to the URL */
    parameters?: Record<string, string>;
  } = {},
  context: {
    /** Provided in react context, you need to provide one (or the module name) otherwise. */
    renderContext?: RenderContext;
  } = useServerContext(),
): string {
  if (/^[a-zA-Z0-9.+-]+:/.test(filePath)) {
    // If path has a protocol (e.g. data: URI), return it as is.
    return filePath;
  }

  if (!context.renderContext && !config.moduleName) {
    throw new Error(
      `You cannot build a module asset url for ${filePath} outside of a RenderContext context`,
    );
  }
  const moduleName = config.moduleName
    ? `/modules/${config.moduleName}`
    : context.renderContext?.getURLGenerator().getCurrentModule();
  return buildEndpointUrl(
    `${moduleName}/${filePath}`,
    { parameters: config.parameters },
    { renderContext: context.renderContext },
  );
}

/** Build an url for any endpoint on the server (/cms/*, /graphql, ect). */
export function buildEndpointUrl(
  /** Endpoint to call */
  endpoint: string,
  config: {
    /** Querystring parameters to append to the URL */
    parameters?: Record<string, string>;
  } = {},
  context: {
    /** Provided in react context, you need to provide one otherwise. */
    renderContext?: RenderContext;
  } = useServerContext(),
): string {
  let url = endpoint;
  if (!absoluteUrlRegExp.test(url) && context.renderContext) {
    url = url.startsWith("/") ? context.renderContext.getRequest().getContextPath() + url : url;
    url = context.renderContext.getResponse().encodeURL(url);
  }
  // Handle parameters
  if (!config.parameters) {
    return url;
  }
  const separator = url.includes("?") ? "&" : "?";
  const URLParameters = Object.keys(config.parameters)
    .map(
      (key) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(config.parameters ? config.parameters[key] : "")}`,
    )
    .join("&");

  return `${url}${separator}${URLParameters}`;
}
