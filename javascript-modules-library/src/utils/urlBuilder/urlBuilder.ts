import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { RenderContext, Resource } from "org.jahia.services.render";
import { useServerContext } from "../../hooks/useServerContext";

// Regex that checks if the first word contains colon (http:, mail:, ftp: ..)
const absoluteUrlRegExp = /^(?:[a-z+]+:)?\/\//i;

/** Initialize the registry with default url builders */
export function initUrlBuilder(): void {
  server.registry.add("urlBuilder", "nt:file", {
    priority: 1,
    buildURL: ({ node, mode }: { node: JCRNodeWrapper; mode: string }) => {
      const workspace = mode === "edit" || mode === "preview" ? "default" : "live";
      return `/files/${workspace}${server.render.escapePath(node.getCanonicalPath())}`;
    },
  });
  server.registry.add("urlBuilder", "*", {
    priority: 0,
    buildURL: ({
      node,
      mode,
      language,
      extension,
    }: {
      node: JCRNodeWrapper;
      mode: string;
      language: string;
      extension: string;
    }) => {
      let workspace: string;
      let servletPath: string;
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
      return `${servletPath}/${workspace}/${language}${server.render.escapePath(node.getPath())}${extension ? extension : ".html"}`;
    },
  });
}

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
  } = {},
  context: {
    /** Provided in react context, but you need to provide one otherwise. * */
    renderContext?: RenderContext;
    /** Provided in react context, you need to provide one otherwise. * */
    currentResource?: Resource;
  } = useServerContext(),
): string {
  if (!node) throw new Error("Expected a node in buildNodeUrl, received undefined");

  // Use context values if not provided
  const mode = config.mode ?? context.renderContext?.getMode();
  const language = config.language ?? context.currentResource?.getLocale().toString();
  const extension = config.extension ?? `.${context.currentResource?.getTemplateType()}`;
  if (!mode || !language || !extension) {
    throw new Error(
      `Mode, language, and extension must not be empty, mode: ${mode}, language: ${language} extension: ${extension}`,
    );
  }
  // Lookiup for the matching url build in the registry.
  const urlBuilders = server.registry.find({ type: "urlBuilder" }, "priority");
  for (const urlBuilder of urlBuilders) {
    if (urlBuilder.key === "*" || node.isNodeType(urlBuilder.key)) {
      return buildEndpointUrl(
        urlBuilder.buildURL({ node, mode, language, extension, context }),
        { parameters: config.parameters },
        { renderContext: context.renderContext },
      );
    }
  }
  // No build has been found
  throw new Error(`Unable to build url for ${JSON.stringify(config)}, no registered builder found`);
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
