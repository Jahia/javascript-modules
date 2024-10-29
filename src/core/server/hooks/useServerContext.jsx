import React, {useContext} from 'react';

const ServerContext = React.createContext({});

/**
 * Returns the current server context
 * @returns {import('@jahia/js-server-core').ServerContext} the server context
 */
export function useServerContext() {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return useContext(ServerContext);
}

export function ServerContextProvider({renderContext, currentResource, currentNode, mainNode, bundleKey, children}) {
    return (
        <ServerContext.Provider value={{renderContext, currentResource, currentNode, mainNode, bundleKey}}>
            {children}
        </ServerContext.Provider>
    );
}
