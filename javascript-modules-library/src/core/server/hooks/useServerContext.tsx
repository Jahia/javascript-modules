import type Lib from '@jahia/javascript-modules-library-private';
import React, {type ReactNode, useContext} from 'react';

const ServerContext = React.createContext<Lib.ServerContext>({} as never);

/**
 * Returns the current server context
 * @returns the server context
 */
export function useServerContext(): Lib.ServerContext {
    return useContext(ServerContext);
}

export function ServerContextProvider({renderContext, currentResource, currentNode, mainNode, bundleKey, children}: Lib.ServerContext & {readonly children: ReactNode}): React.JSX.Element {
    return (
        <ServerContext.Provider value={{renderContext, currentResource, currentNode, mainNode, bundleKey}}>
            {children}
        </ServerContext.Provider>
    );
}
