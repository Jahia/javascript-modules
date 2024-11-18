import * as jsServerCore from '@jahia/js-server-core';
import jsServerCoreBuilder from '@jahia/js-server-core-builder';
import React from 'react';
import * as ReactI18Next from 'react-i18next';
import I18next from 'i18next';
import styledJsx from 'styled-jsx/style';

export default () => {
    // Repackage @jahia/js-server-core for runtime
    for (const [key, value] of Object.entries(jsServerCore)) {
        jsServerCoreBuilder.addToLibrary(key, value);
    }

    jsServerCoreBuilder.addSharedLibrary('react', React);
    jsServerCoreBuilder.addSharedLibrary('react-i18next', ReactI18Next);
    jsServerCoreBuilder.addSharedLibrary('i18next', I18next);
    jsServerCoreBuilder.addSharedLibrary('styled-jsx', styledJsx);
};
