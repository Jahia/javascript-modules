import i18n from "i18next";
import backend from "./backend";
import { initReactI18next } from "react-i18next";

export default () => {
  i18n
    .use(backend)
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
};
