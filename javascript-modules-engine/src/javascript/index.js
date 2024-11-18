import 'fast-text-encoding'; // Required for React 18 to work (normally provided by browsers or NodeJS, it is not in GraalJS)
import initI18next from './i18next/init';
import initReact from './react/init';
import initJsServerEngineLibrary from './library/init';
import {initUrlBuilder} from '@jahia/js-server-core';

initI18next();
initUrlBuilder();
initReact();
initJsServerEngineLibrary();

// Uses setTimeout polyfill
global.setTimeout = ((cb, t) => {
    if (t === 0) {
        // eslint-disable-next-line no-new
        new Promise(resolve => {
            console.log('Execute timeout');
            cb();
            resolve();
        });
    }
});
