import * as devalue from "devalue";
import i18n from "i18next";
import { createElement } from "react";
import { I18nextProvider } from "react-i18next";
import sharedLibFiles from "virtual:shared-lib-files";
import { useServerContext } from "../../../hooks/useServerContext.js";
import { buildModuleFileUrl } from "../../../utils/urlBuilder/urlBuilder";
import { AddResources } from "../../AddResources.js";

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

    return /* HTML */ `<script type="application/json" data-i18n-store="${bundleKey}">
      ${devalue.stringify(filteredI18nStore)}
    </script>`;
  }
};

function InBrowser<T>({
  child: Child,
  props,
  ssr,
  children,
}: Readonly<{
  child: React.ComponentType<T>;
  props: T & React.JSX.IntrinsicAttributes;
  ssr?: boolean;
  children?: React.ReactNode;
}>): React.JSX.Element {
  const { bundleKey, currentResource } = useServerContext();
  const language = currentResource.getLocale().getLanguage();

  const i18nScript = getClientI18nStoreScript(bundleKey, language);

  /** Base path to all javascript-modules-engine resources. */
  const engineBase = buildModuleFileUrl("javascript", { moduleName: "javascript-modules-engine" });

  /** JS entry point to the client bundle loader. */
  // @ts-expect-error __filename is added by a vite plugin
  const entry = buildModuleFileUrl(`${Child.__filename}.js`);

  return (
    <>
      {/* Insert modulepreload hints to preload files deep in the dependency tree */}
      <AddResources
        key="jsm-importmap-preload"
        insert
        targetTag="head"
        inlineResource={sharedLibFiles
          .map((file) => `<link rel="modulepreload" href="${engineBase}/shared-libs/${file}" />`)
          .join("")}
      />
      <AddResources
        key={`jsm-preload-${entry}`}
        insert
        targetTag="head"
        inlineResource={`<link rel="modulepreload" href="${entry}" />`}
      />
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
        inlineResource={`<script type="module" src="${engineBase}/index.js"></script>`}
      />

      {
        // We use a custom element to create the hydration marker, rather than a div or a span,
        // to prevent a broken DOM structure in the browser. (e.g. a `<div>` inside a `<p>`)
        createElement(ssr ? "jsm-hydrate" : "jsm-render", {
          "style": { display: "contents" },
          "data-src": entry,
          "data-lang": language,
          "data-bundle": bundleKey,
          "children": [
            props !== undefined && (
              <script type="application/json">{devalue.stringify(props)}</script>
            ),
            ssr ? (
              <I18nextProvider i18n={i18n}>
                <Child {...props}>
                  {createElement("jsm-children", { style: { display: "contents" }, children })}
                </Child>
              </I18nextProvider>
            ) : (
              children
            ),
          ],
        })
      }

      {i18nScript && (
        <AddResources key={`i18n_initialStore_${bundleKey}`} insert inlineResource={i18nScript} />
      )}
    </>
  );
}

export default InBrowser;
