import {server} from '@jahia/js-server-engine-private';

export const registerJahiaComponents = jahiaComponents => {
    const reactView = server.registry.get('view', 'react');
    Object.keys(jahiaComponents).forEach(k => {
        let options;
        const props = jahiaComponents[k].jahiaComponent;

        if (!props || !props.id || !props.target) {
            return;
        }

        options = {
            templateName: 'default',
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
