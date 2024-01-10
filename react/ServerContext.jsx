import React, {useContext} from 'react';
import PropTypes from 'prop-types';

export const ServerContext = React.createContext({});
export const useServerContext = () => useContext(ServerContext);
export const ServerContextProvider = ({renderContext, currentResource, currentNode, mainNode, children}) => {
    return (
        <ServerContext.Provider value={{renderContext, currentResource, currentNode, mainNode}}>
            {children}
        </ServerContext.Provider>
    );
};

ServerContextProvider.propTypes = {
    renderContext: PropTypes.any,
    currentResource: PropTypes.any,
    currentNode: PropTypes.any,
    mainNode: PropTypes.any,
    children: PropTypes.node.isRequired
};
