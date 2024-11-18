import * as javascriptModulesLibrary from '@jahia/javascript-modules-library';
import javascriptModulesLibraryBuilder from '@jahia/javascript-modules-library-builder';
import React from 'react';
import * as ReactI18Next from 'react-i18next';
import I18next from 'i18next';
import styledJsx from 'styled-jsx/style';

export default () => {
    // Repackage @jahia/javascript-modules-library for runtime
    for (const [key, value] of Object.entries(javascriptModulesLibrary)) {
        javascriptModulesLibraryBuilder.addToLibrary(key, value);
    }

    javascriptModulesLibraryBuilder.addSharedLibrary('react', React);
    javascriptModulesLibraryBuilder.addSharedLibrary('react-i18next', ReactI18Next);
    javascriptModulesLibraryBuilder.addSharedLibrary('i18next', I18next);
    javascriptModulesLibraryBuilder.addSharedLibrary('styled-jsx', styledJsx);
};
