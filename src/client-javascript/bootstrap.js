import {hydrateReactComponents, renderReactComponents} from './react';
import initI18next from './i18next/init';

initI18next();
hydrateReactComponents(document.documentElement);
renderReactComponents(document.documentElement);
