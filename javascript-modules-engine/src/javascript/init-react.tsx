import { ServerContextProvider } from "@jahia/javascript-modules-library";
import i18n from "i18next";
import type { RenderContext, Resource } from "org.jahia.services.render";
import type { Bundle } from "org.osgi.framework";
import type { ComponentType } from "react";
import ReactDOMServer from "react-dom/server.edge";
import { I18nextProvider } from "react-i18next";

server.registry.add("view", "react", {
  viewRenderer: "react",
});

server.registry.add("viewRenderer", "react", {
  render: (
    currentResource: Resource,
    renderContext: RenderContext,
    view: { bundle: Bundle; component: ComponentType },
  ) => {
    const bundleKey = view.bundle.getSymbolicName();
    // I18next configuration
    // Load locales
    const language = currentResource.getLocale().getLanguage();
    i18n.loadNamespaces(bundleKey);
    i18n.loadLanguages(language);
    // Set module namespace and current language
    i18n.setDefaultNamespace(bundleKey);
    i18n.changeLanguage(language);

    // SSR
    const currentNode = currentResource.getNode();
    const mainNode = renderContext.getMainResource().getNode();
    const View = view.component;
    const element = (
      <ServerContextProvider
        renderContext={renderContext}
        currentResource={currentResource}
        currentNode={currentNode}
        mainNode={mainNode}
        jcrSession={currentNode.getSession()}
        bundleKey={bundleKey}
      >
        <I18nextProvider i18n={i18n}>
          <View />
        </I18nextProvider>
      </ServerContextProvider>
    );

    const html =
      // In page mode, prepend the rendered HTML with the HTML5 doctype
      (currentResource.getContextConfiguration() === "page" ? "<!DOCTYPE html>" : "") +
      // We use a `<jsm-raw-html>` element to wrap raw HTML output because React does not allow
      // directly returning raw HTML strings. These elements are removed there, to avoid
      // having them in the final output.
      // `<jsm-raw-html>` SHOULD NOT be used in userland code, it is an internal implementation
      // detail.
      ReactDOMServer.renderToString(element).replaceAll(/<\/?jsm-raw-html>/g, "");

    if (currentResource.getContextConfiguration() === "page") {
      return `<!DOCTYPE html>${html}`;
    }

    return html;
  },
});
