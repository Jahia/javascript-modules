import {server} from '@jahia/js-server-core-private';

/**
 * Registers Jahia components into the global registry as views
 * @param {Object} jahiaComponents an object containing the jahia components to register
 * TODO We will probably want to revisit this function once we handle global component registration in ticket https://jira.jahia.org/browse/BACKLOG-22400
 */
export function registerJahiaComponents(jahiaComponents) {
    // First we check if the global variable bundle is available. If it is not, it means we are using the function outside of the
    // initialization of the bundle, which is an error !
    if (!bundle) {
        console.error('registerJahiaComponents: bundle is not available, make sure you are using this function inside the initialization of the bundle');
        return;
    }

    const bundleSymbolicName = bundle.getSymbolicName();

    const reactView = server.registry.get('view', 'react');
    Object.keys(jahiaComponents).forEach(k => {
        let options;
        const props = jahiaComponents[k].jahiaComponent;

        if (!props || !props.nodeType || !props.componentType) {
            console.warn(`registerJahiaComponents(bundle=${bundleSymbolicName}: Missing mandatory property nodeType and/or componentType, skipping component name=${props.name} nodeType=${props.nodeType} id=${props.id} registration`);
            return;
        }

        options = {
            name: 'default',
            templateType: 'html'
        };

        let id = props.id;
        delete props.id;
        options.component = jahiaComponents[k];

        // Replace default values if set in view
        const processOptions = {...options, ...props};

        // If id is not provided, generate it using bundleSymbolicName, componentType, nodeType, and name
        if (!id) {
            id = `${bundleSymbolicName}_${processOptions.componentType}_${processOptions.nodeType}_${processOptions.name}`;
        }

        // Register view
        server.registry.add('view', id, reactView, processOptions);
    });
}
