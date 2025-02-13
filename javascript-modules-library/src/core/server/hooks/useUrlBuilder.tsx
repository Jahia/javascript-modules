import { useServerContext } from "./useServerContext.js";
import { buildUrl as originalBuildUrl } from "../utils/urlBuilder/urlBuilder.js";

interface UrlBuilderType {
  /**
   * Builds a static URL for an asset.
   *
   * @returns The built URL.
   */
  buildStaticUrl(props: {
    /** The path of the asset */
    assetPath: string;
    /**
     * The name of the module used as prefix for the URL. If not provided, the current module is
     * used.
     */
    moduleName?: string;
    /** The parameters to append to the URL */
    parameters?: Record<string, string>;
  }): string;
  /**
   * Builds a URL for a JCR node.
   *
   * @returns {string} The built URL.
   */
  buildNodeUrl(props: {
    /** The path of JCR node */
    nodePath: string;
    /** The extension to use to build the URL */
    extension?: string;
    /** The language to use to build the URL */
    language?: string;
    /** The mode to use to build the URL ('edit', 'preview', 'live') */
    mode?: "edit" | "preview" | "live";
    /** The parameters to append to the URL */
    parameters?: Record<string, string>;
  }): string;
  /**
   * Builds an HTML fragment URL for a JCR node.
   *
   * @returns {string} The built URL.
   */
  buildHtmlFragmentUrl(props: {
    /** The path of JCR node */
    nodePath: string;
    /** The language to use to build the URL */
    language?: string;
    /** The mode to use to build the URL ('edit', 'preview', 'live') */
    mode?: "edit" | "preview" | "live";
    /** The parameters to append to the URL */
    parameters?: Record<string, string>;
  }): string;
}

export function useUrlBuilder(): UrlBuilderType {
  const { renderContext, currentResource } = useServerContext();

  return {
    buildStaticUrl({
      assetPath,
      moduleName = renderContext?.getURLGenerator()?.getCurrentModule(),
      parameters = undefined,
    }) {
      return originalBuildUrl(
        {
          value: moduleName + "/static" + (assetPath?.startsWith("/") ? "" : "/") + assetPath,
          parameters,
        },
        renderContext,
        currentResource,
      );
    },
    buildNodeUrl({ nodePath, extension, language, mode, parameters }) {
      return originalBuildUrl(
        {
          path: nodePath,
          extension,
          language,
          mode,
          parameters,
        },
        renderContext,
        currentResource,
      );
    },
    buildHtmlFragmentUrl({ nodePath, language, mode, parameters }) {
      return originalBuildUrl(
        {
          path: nodePath,
          extension: ".html.ajax",
          language,
          mode,
          parameters,
        },
        renderContext,
        currentResource,
      );
    },
  };
}
