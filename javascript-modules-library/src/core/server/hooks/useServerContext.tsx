import type Lib from "@jahia/javascript-modules-library-private";
import { createContext, type ReactNode, use } from "react";

const ServerContext = createContext<Lib.ServerContext>({} as never);

/**
 * Returns the current server context
 *
 * @returns The server context
 */
export function useServerContext(): Lib.ServerContext {
  return use(ServerContext);
}

export function ServerContextProvider({
  renderContext,
  currentResource,
  currentNode,
  mainNode,
  bundleKey,
  children,
}: Lib.ServerContext & { readonly children: ReactNode }): React.JSX.Element {
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
