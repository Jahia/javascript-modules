import React, {useContext} from 'react';

export const ServerContext = React.createContext({});
export const useServerContext = () => useContext(ServerContext);
export const ServerContextProvider = ({renderContext, currentResource, currentNode, mainNode, children}) => {
    return (
        <ServerContext.Provider value={{renderContext, currentResource, currentNode, mainNode}}>
            {children}
        </ServerContext.Provider>
    );
};