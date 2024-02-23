import {server} from '@jahia/js-server-engine-private';

/**
 * Registers Jahia components into the global registry as views
 * @param {Object} jahiaComponents an object containing the jahia components to register
 * @param {string} [moduleName] an optional module name to use for generating component ids, if it isn't
 *                              provided you must specify the id for each component
 */
export const registerJahiaComponents = (jahiaComponents, moduleName) => {
    const reactView = server.registry.get('view', 'react');
    Object.keys(jahiaComponents).forEach(k => {
        let options;
        const props = jahiaComponents[k].jahiaComponent;

        if (!props || !props.nodeType || !props.componentType) {
            console.warn(`registerJahiaComponents(moduleName=${moduleName}: Missing mandatory property nodeType and/or componentType, skipping component name=${props.name} nodeType=${props.nodeType} id=${props.id} registration`);
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

        // If id is not provided, generate it using moduleName, componentType, nodeType, and name
        if (!id && moduleName) {
            id = `${moduleName}_${processOptions.componentType}_${processOptions.nodeType}_${processOptions.name}`;
        } else if (!id && !moduleName) {
            // If id is not provided and moduleName is not provided, log a warning and skip registration
            console.warn(`registerJahiaComponents: Missing id or moduleName for component name=${props.name} nodeType=${props.nodeType} id=${props.id}, skipping registration`);
            return;
        }

        // Register view
        server.registry.add('view', id, reactView, processOptions);
    });
};
