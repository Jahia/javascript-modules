import React, {useContext} from 'react';

export const UseServerContext = React.createContext({});

/**
 * Returns the current server context
 * @returns {import('@jahia/js-server-core').ServerContext} the server context
 */
export function useServerContext() {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return useContext(UseServerContext);
}

export function ServerContextProvider({renderContext, currentResource, currentNode, mainNode, bundleKey, children}) {
    return (
        <UseServerContext.Provider value={{renderContext, currentResource, currentNode, mainNode, bundleKey}}>
            {children}
        </UseServerContext.Provider>
    );
}
