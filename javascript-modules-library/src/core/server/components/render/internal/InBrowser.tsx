import { useServerContext } from "../../../hooks/useServerContext.js";
import { AddResources } from "../../AddResources.js";
import { I18nextProvider } from "react-i18next";
import i18n from "i18next";
import { buildUrl } from "../../../utils/urlBuilder/urlBuilder.js";

/**
 * Import map to allow bare identifiers (e.g. `import { useState } from "react"`) to be imported
 * from our bundle in the browser.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap}
 */
const getImportMap = (base: string) =>
  /* HTML */ `<script type="importmap">
    ${JSON.stringify({
      imports: {
        // Explicitly exposed:
        "react": `${base}/shared-libs/react.js`,
        "i18next": `${base}/shared-libs/i18next.js`,
        "react-i18next": `${base}/shared-libs/react-i18next.js`,
        // Implicitly exposed, referenced after compilation:
        "react/jsx-runtime": `${base}/shared-libs/react/jsx-runtime.js`,
        // For internal use:
        "react-dom/client": `${base}/shared-libs/react-dom/client.js`,
      },
    })}
  </script>`;

const getClientI18nStoreScript = (bundleKey: string, lang: string) => {
  const i18nResourceBundle = i18n.getResourceBundle(lang, bundleKey);
  if (i18nResourceBundle) {
    const filteredI18nStore = { [lang]: i18nResourceBundle };

    // TODO: prevent accidental XSS with </script> in the JSON
    return /* HTML */ `<script type="application/json" data-i18n-store="${bundleKey}">
      ${JSON.stringify(filteredI18nStore)}
    </script>`;
  }
};

function InBrowser<T>({
  child: Child,
  props,
  ssr,
}: Readonly<{
  child: React.ComponentType<T>;
  props: T & React.JSX.IntrinsicAttributes;
  ssr?: boolean;
}>): React.JSX.Element {
  const { bundleKey, currentResource, renderContext } = useServerContext();
  const language = currentResource.getLocale().getLanguage();

  const i18nScript = getClientI18nStoreScript(bundleKey, language);

  /** Base path to all javascript-modules-engine resources. */
  const engineBase = buildUrl(
    { value: "/modules/javascript-modules-engine/javascript" },
    renderContext,
    currentResource,
  );

  /** JS entry point to the client bundle loader. */
  const entry = buildUrl(
    { value: `/modules/${bundleKey}/javascript/client/index.js` },
    renderContext,
    currentResource,
  );

  return (
    <>
      {/* The import map must come first in the page so that all imports are resolved correctly */}
      <AddResources
        key="jsm-importmap"
        insert
        targetTag="head"
        inlineResource={getImportMap(engineBase)}
      />
      <AddResources
        key="jsm-bootstrap"
        insert
        targetTag="body"
        inlineResource={/** HTML */ `<script type="module" src="${engineBase}/index.js"></script>`}
      />

      <div>
        <script type="application/json" data-hydration-mode={ssr ? "hydrate" : "render"}>
          {JSON.stringify({
            name: Child.name,
            lang: language,
            entry,
            bundle: bundleKey,
            props: props || {},
          })}
        </script>
        {ssr && (
          <I18nextProvider i18n={i18n}>
            <Child {...props} />
          </I18nextProvider>
        )}
      </div>

      {i18nScript && (
        <AddResources key={`i18n_initialStore_${bundleKey}`} insert inlineResource={i18nScript} />
      )}
    </>
  );
}

export default InBrowser;
