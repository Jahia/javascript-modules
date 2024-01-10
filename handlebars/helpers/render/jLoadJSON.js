import {osgi} from '@jahia/server-helpers';

export default function (path, varName, options) {
    if (varName && path && path.endsWith('.json')) {
        const currentView = options.data.root.view;

        let resourcePath;
        if (path.startsWith('/')) {
            // Handle absolute path, need to remove first "/" to access the resource in the bundle
            resourcePath = path.substring(1);
        } else {
            // Handle relative path to current rendered view
            const templateViewFile = currentView.hbsTemplateFile;
            const templateViewFolder = templateViewFile.substring(0, templateViewFile.lastIndexOf('/'));
            resourcePath = templateViewFolder + '/' + path;
        }

        this[varName] = JSON.parse(osgi.loadResource(currentView.bundle, resourcePath, false));
    }

    return '';
}

