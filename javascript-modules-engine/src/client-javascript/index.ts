import { initI18next } from "./i18next/index.js";
import { hydrateReactComponents } from "./react/index.js";

initI18next();
hydrateReactComponents(document.documentElement);
