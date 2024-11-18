import React from 'react';
import i18n from 'i18next';
import PropTypes from 'prop-types';

const BaseApp = ({ns, lang, app: App, appProps}) => {
    i18n.setDefaultNamespace(ns);
    i18n.changeLanguage(lang);

    return (
        <App {...appProps}/>
    );
};

BaseApp.propTypes = {
    ns: PropTypes.string.isRequired, // Namespace string
    lang: PropTypes.string.isRequired, // Language string
    app: PropTypes.elementType.isRequired, // React component
    appProps: PropTypes.object // Props object for the app component
};

export default BaseApp;
