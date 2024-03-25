import React from 'react';
import {useServerContext} from '../useServerContext';
import {AddResources} from '../AddResources';
import {buildUrl} from '../../urlBuilder';
import {getInitialProps, I18nextProvider} from 'react-i18next';
import i18n from 'i18next';

const getClientI18nStoreScript = (i18nStore, namespace, lang) => {
    // I18n is a global instance share by all views, all bundles and contains all translations for all namespaces.
    // Since we need to pass the initialI18nStore to the client, we need to filter it to keep only the necessary language and namespace.
    // This way we can reduce the size of the initialI18nStore to the minimal required for the client side rendering.
    if (i18nStore[lang] && i18nStore[lang][namespace]) {
        const filteredI18nStore = {};
        filteredI18nStore[lang] = {};
        filteredI18nStore[lang][namespace] = i18nStore[lang][namespace];

        return '<script type="text/javascript">\n' +
            '        if(!window.__APPSHELL_INIT_DATA__) {\n' +
            '            window.__APPSHELL_INIT_DATA__ = {};\n' +
            '        }\n' +
            '        if(!window.__APPSHELL_INIT_DATA__.initialI18nStore) {\n' +
            '            window.__APPSHELL_INIT_DATA__.initialI18nStore = [];\n' +
            '        }\n' +
            `        window.__APPSHELL_INIT_DATA__.initialI18nStore.push(${JSON.stringify(filteredI18nStore)});\n` +
            '    </script>';
    }
};

const getAppShellInitData = moduleBaseUrl => {
    return '<script type="text/javascript">\n' +
        '        if(!window.__APPSHELL_INIT_DATA__) {\n' +
        '            window.__APPSHELL_INIT_DATA__ = {};\n' +
        '        }\n' +
        `        window.__APPSHELL_INIT_DATA__.moduleBaseUrl = '${moduleBaseUrl}';\n` +
        '    </script>';
};

function InBrowser({child: Child, props, dataKey}) {
    const {bundleKey, currentResource, renderContext} = useServerContext();
    const {initialI18nStore, initialLanguage} = getInitialProps();

    const appShellInitDataScript = getAppShellInitData(buildUrl({value: '/modules'}, renderContext, currentResource));
    const i18nScript = getClientI18nStoreScript(initialI18nStore, bundleKey, initialLanguage);
    // The paths are absolute here to avoid jAddResources to look for .js in other modules
    const remote = buildUrl({value: '/modules/' + bundleKey + '/javascript/client/remote.js'}, renderContext, currentResource);
    const appShell = buildUrl({value: '/modules/npm-modules-engine/javascript/apps/reactAppShell.js'}, renderContext, currentResource);

    const data = {};
    data[dataKey] = encodeURIComponent(JSON.stringify({
        name: Child.name,
        lang: initialLanguage,
        bundle: bundleKey,
        props: props || {}
    }));

    return (
        <>
            <div {...data}>
                <I18nextProvider i18n={i18n}>
                    <Child {...props}/>
                </I18nextProvider>
            </div>

            {i18nScript && <AddResources key={`i18n_initialStore_${bundleKey}`} insert inlineResource={i18nScript}/>}
            <AddResources key="npm-engine-appShellInitData" insert inlineResource={appShellInitDataScript}/>
            <AddResources insert type="javascript" targetTag="body" resources={remote}/>
            <AddResources type="javascript" targetTag="body" resources={appShell}/>
        </>
    );
}

export default InBrowser;
