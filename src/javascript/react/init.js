import {server} from '@jahia/js-server-core-private';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import {createStyleRegistry, StyleRegistry} from 'styled-jsx';
import {ServerContextProvider} from '@jahia/js-server-core';
import i18n from 'i18next';
import {I18nextProvider} from 'react-i18next';

export default () => {
    server.registry.add('view', 'react', {
        viewRenderer: 'react'
    });

    server.registry.add('viewRenderer', 'react', {
        render: (currentResource, renderContext, view) => {
            const bundleKey = view.bundle.getSymbolicName();
            // I18next configuration
            // Load locales
            const language = currentResource.getLocale().getLanguage();
            i18n.loadNamespaces(bundleKey);
            i18n.loadLanguages(language);
            // Set module namespace and current language
            i18n.setDefaultNamespace(bundleKey);
            i18n.changeLanguage(language);

            // SSR
            const props = {
                id: 'reactTarget' + Math.floor(Math.random() * 100000000)
            };
            const styleRegistry = createStyleRegistry();
            const currentNode = currentResource.getNode();
            const mainNode = renderContext.getMainResource().getNode();
            const element =
                React.createElement(StyleRegistry, {registry: styleRegistry}, React.createElement(ServerContextProvider, {renderContext, currentResource, currentNode, mainNode, bundleKey}, React.createElement(I18nextProvider, {i18n}, React.createElement(view.component, {...props}))));

            // Some server side components are using dangerouslySetInnerHTML to render their content,
            // we need to clean the output to avoid having unwanted divs in the final output (e.g. <unwanteddiv>content</unwanteddiv>)
            const cleanedRenderedElement = ReactDOMServer.renderToString(element)
                .replace(/<unwanteddiv>/g, '')
                .replace(/<\/unwanteddiv>/g, '');

            const styles = ReactDOMServer.renderToStaticMarkup(styleRegistry.styles());
            const stylesResource = styles ? `<jahia:resource type="inline" key="styles${props.id}">${styles}</jahia:resource>` : '';
            if (currentResource.getContextConfiguration() === 'page') {
                // Set the HTML5 doctype that can't be rendered in JSX
                return `<!DOCTYPE html>${cleanedRenderedElement}${stylesResource}`;
            }

            return `${cleanedRenderedElement}${stylesResource}`;
        }
    });
};
