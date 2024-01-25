import {server} from '@jahia/js-server-engine-private';

/**
 * Registers Jahia components into the global registry as views
 * @param {Object} jahiaComponents an object containing the jahia components to register
 */
export const registerJahiaComponents = jahiaComponents => {
    const reactView = server.registry.get('view', 'react');
    Object.keys(jahiaComponents).forEach(k => {
        let options;
        const props = jahiaComponents[k].jahiaComponent;

        if (!props || !props.id || !props.nodeType || !props.componentType) {
            console.warn('Missing mandatory property id, nodeType and/or componentType, skipping component registration');
            return;
        }

        options = {
            name: 'default',
            templateType: 'html'
        };

        const id = props.id;
        delete props.id;
        options.component = jahiaComponents[k];

        // Replace default values if set in view
        const processOptions = {...options, ...props};
        // Register view
        server.registry.add('view', id, reactView, processOptions);
    });
};
