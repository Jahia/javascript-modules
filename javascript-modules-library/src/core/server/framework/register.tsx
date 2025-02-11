import {server} from '@jahia/javascript-modules-library-private';
import type {JahiaComponent} from './defineJahiaComponent.js';
import type {Bundle} from 'org.osgi.framework';

/** This is provided by Jahia runtime */
declare const bundle : Bundle;

/**
 * Registers Jahia components into the global registry as views
 * @param jahiaComponents an object containing the jahia components to register
 * TODO We will probably want to revisit this function once we handle global component registration in ticket https://jira.jahia.org/browse/BACKLOG-22400
 */
export function registerJahiaComponents(jahiaComponents: Record<string | number | symbol, {
    (): React.JSX.Element,
    jahiaComponent: JahiaComponent
}>): void {
    // First we check if the global variable bundle is available. If it is not, it means we are using the function outside of the
    // initialization of the bundle, which is an error !
    if (!bundle) {
        console.error('registerJahiaComponents: bundle is not available, make sure you are using this function inside the initialization of the bundle');
        return;
    }

    const bundleSymbolicName = bundle.getSymbolicName();

    const reactView = server.registry.get('view', 'react');

    for (const component of Object.values(jahiaComponents)) {
        const {id, ...props} = component.jahiaComponent;

        if (!props.nodeType || !props.componentType) {
            console.warn(`registerJahiaComponents(bundle=${bundleSymbolicName}: Missing mandatory property nodeType and/or componentType, skipping component name=${props.name} nodeType=${props.nodeType} id=${id} registration`);
            return;
        }

        const options = {
            name: 'default',
            templateType: 'html',
            component,
            ...props
        };

        // Register view
        server.registry.add(
            'view',
            // If id is not provided, generate it using bundleSymbolicName, componentType, nodeType, and name
            id ?? `${bundleSymbolicName}_${options.componentType}_${options.nodeType}_${options.name}`,
            reactView,
            options
        );
    }
}
