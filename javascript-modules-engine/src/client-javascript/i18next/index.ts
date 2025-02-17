import i18n from "i18next";
import { initReactI18next } from "react-i18next";

export const initI18next = () => {
  i18n.use(initReactI18next).init({
    fallbackLng: "en",
    ns: "javascript-modules-engine",
    defaultNS: "javascript-modules-engine",
    initImmediate: false,
    react: { useSuspense: false },
  });

  const initialI18nStore: Record<string, Record<string, unknown>> = {};
  const namespaces: string[] = [];

  for (const store of document.querySelectorAll<HTMLScriptElement>("script[data-i18n-store]")) {
    const namespace = store.dataset.i18nStore;
    namespaces.push(namespace);

    const allTranslations = JSON.parse(store.textContent);
    for (const [lang, translations] of Object.entries(allTranslations)) {
      initialI18nStore[lang] ??= {};
      initialI18nStore[lang][namespace] = translations;
    }
  }

  // Init i18n internal store
  i18n.services.resourceStore.data = initialI18nStore;
  i18n.options.ns = namespaces;
};
