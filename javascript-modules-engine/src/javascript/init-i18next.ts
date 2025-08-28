import i18n, { type BackendModule } from "i18next";
import { initReactI18next } from "react-i18next";
import server from "virtual:jahia-server";

i18n
  .use({
    type: "backend",

    init() {},

    read(language, namespace, callback) {
      const bundle = server.osgi.getBundle(namespace);
      if (bundle) {
        // See JavascriptProtocolConnection.java that is moving the settings/locales to META-INF/locales
        // (Maybe we will move locales registration in the src and make the registration programmatically like JS views,
        // using the registry. But for now, we are using the META-INF/locales folder and .json files)
        const content = server.osgi.loadResource(bundle, `META-INF/locales/${language}.json`, true);
        if (content) {
          callback(null, JSON.parse(content));
        } else {
          // No locales found
          callback(null, {});
        }
      } else {
        callback(`Cannot find bundle: ${namespace}`, null);
      }
    },

    create() {},
  } satisfies BackendModule)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    ns: "javascript-modules-engine",
    defaultNS: "javascript-modules-engine",
    initImmediate: false,
    react: {
      useSuspense: false,
    },
  });
