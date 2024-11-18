import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
export default () => {
    i18n
        .use(initReactI18next)
        .init({
            fallbackLng: 'en',
            ns: 'npm-modules-engine',
            defaultNS: 'npm-modules-engine',
            initImmediate: false,
            react: {
                useSuspense: false
            }
        });

    if (window.__APPSHELL_INIT_DATA__ && window.__APPSHELL_INIT_DATA__.initialI18nStore) {
        const initialI18nStore = {};

        // Merge all stores from SSR rendering views
        window.__APPSHELL_INIT_DATA__.initialI18nStore.forEach(obj => {
            for (let lang in obj) {
                // eslint-disable-next-line no-prototype-builtins
                if (obj.hasOwnProperty(lang)) {
                    if (!initialI18nStore[lang]) {
                        initialI18nStore[lang] = {};
                    }

                    Object.assign(initialI18nStore[lang], obj[lang]);
                }
            }
        });

        // Init i18n internal store
        i18n.services.resourceStore.data = initialI18nStore;
        i18n.options.ns = Object.values(initialI18nStore).reduce((mem, lngResources) => {
            Object.keys(lngResources).forEach(ns => {
                if (mem.indexOf(ns) < 0) {
                    mem.push(ns);
                }
            });
            return mem;
        }, i18n.options.ns);
    }
};
