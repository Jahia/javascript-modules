import { createContext, type ReactNode, use } from "react";
import type { RenderContext, Resource } from "org.jahia.services.render";
import type { JCRNodeWrapper } from "org.jahia.services.content";

/**
 * A context object that gives access to the underlying Jahia Java objects that are part of the
 * current rendering context
 */
export interface ServerContext {
  /**
   * Jahia's rendering context, it provides access to all kinds of context information, such as the
   * current request, response, user, mode, mainResource and more
   */
  renderContext: RenderContext;
  /**
   * The current resource being rendered, which is a combination of the current node and its
   * template/view information
   */
  currentResource: Resource;
  /** The current JCR node being rendered */
  currentNode: JCRNodeWrapper;
  /** The main JCR node being rendered, which is the root node of the current page */
  mainNode: JCRNodeWrapper;
  /** The OSGi bundle key of the current module being rendered */
  bundleKey: string;
}

const ServerContext = createContext<ServerContext>({} as never);

/**
 * Returns the current server context
 *
 * @returns The server context
 */
export function useServerContext(): ServerContext {
  return use(ServerContext);
}

export function ServerContextProvider({
  renderContext,
  currentResource,
  currentNode,
  mainNode,
  bundleKey,
  children,
}: ServerContext & { readonly children: ReactNode }): React.JSX.Element {
  return (
    <ServerContext
      value={{
        renderContext,
        currentResource,
        currentNode,
        mainNode,
        bundleKey,
      }}
    >
      {children}
    </ServerContext>
  );
}
