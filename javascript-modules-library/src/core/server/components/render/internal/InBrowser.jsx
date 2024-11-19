import React from 'react';
import {useServerContext} from '../../../hooks/useServerContext';
import {AddResources} from '../../AddResources';
import {buildUrl} from '../../../utils/urlBuilder';
import {I18nextProvider} from 'react-i18next';
import i18n from 'i18next';

const getClientI18nStoreScript = (lang, namespace) => {
    const i18nResourceBundle = i18n.getResourceBundle(lang, namespace);
    if (i18nResourceBundle) {
        const filteredI18nStore = {};
        filteredI18nStore[lang] = {};
        filteredI18nStore[lang][namespace] = i18nResourceBundle;

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

function InBrowser({child: Child, props, dataKey, preRender}) {
    const {bundleKey, currentResource, renderContext} = useServerContext();
    const language = currentResource.getLocale().getLanguage();
    const appShellInitDataScript = getAppShellInitData(buildUrl({value: '/modules'}, renderContext, currentResource));
    const i18nScript = getClientI18nStoreScript(language, bundleKey);
    // The paths are absolute here to avoid jAddResources to look for .js in other modules
    const remote = buildUrl({value: '/modules/' + bundleKey + '/javascript/client/remote.js'}, renderContext, currentResource);
    const appShell = buildUrl({value: '/modules/javascript-modules-engine/javascript/apps/reactAppShell.js'}, renderContext, currentResource);

    const data = {};
    data[dataKey] = encodeURIComponent(JSON.stringify({
        name: Child.name,
        lang: language,
        bundle: bundleKey,
        props: props || {}
    }));

    return (
        <>
            <div {...data}>
                {preRender && <I18nextProvider i18n={i18n}><Child {...props}/></I18nextProvider>}
            </div>

            {i18nScript && <AddResources key={`i18n_initialStore_${bundleKey}`} insert inlineResource={i18nScript}/>}
            <AddResources key="npm-engine-appShellInitData" insert inlineResource={appShellInitDataScript}/>
            <AddResources insert type="javascript" targetTag="body" resources={remote}/>
            <AddResources type="javascript" targetTag="body" resources={appShell}/>
        </>
    );
}

export default InBrowser;
