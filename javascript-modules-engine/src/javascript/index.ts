import "fast-text-encoding"; // Required until Graal exposes TextEncoder
import initI18next from "./i18next/init.js";
import initReact from "./react/init.js";
import initJsServerEngineLibrary from "./library/init.js";
import { initUrlBuilder } from "@jahia/javascript-modules-library";

initI18next();
initUrlBuilder();
initReact();
initJsServerEngineLibrary();
