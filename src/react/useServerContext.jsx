import React, {useContext} from 'react';

export const UseServerContext = React.createContext({});
export const useServerContext = () => useContext(UseServerContext);
export function ServerContextProvider({renderContext, currentResource, currentNode, mainNode, bundleKey, language, children}) {
    return (
        <UseServerContext.Provider value={{renderContext, currentResource, currentNode, mainNode, bundleKey, language}}>
            {children}
        </UseServerContext.Provider>
    );
}
