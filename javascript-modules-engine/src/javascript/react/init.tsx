import { ServerContextProvider } from "@jahia/javascript-modules-library";
import i18n from "i18next";
import type { RenderContext, Resource } from "org.jahia.services.render";
import type { Bundle } from "org.osgi.framework";
import type { ComponentType } from "react";
import ReactDOMServer from "react-dom/server.edge";
import { I18nextProvider } from "react-i18next";
import { createStyleRegistry, StyleRegistry } from "styled-jsx";
import server from "virtual:jahia-server";

export default () => {
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
      const styleRegistry = createStyleRegistry();
      const currentNode = currentResource.getNode();
      const mainNode = renderContext.getMainResource().getNode();
      const View = view.component;
      const element = (
        <StyleRegistry registry={styleRegistry}>
          <ServerContextProvider
            renderContext={renderContext}
            currentResource={currentResource}
            currentNode={currentNode}
            mainNode={mainNode}
            jcrSession={currentNode.getSession()}
            bundleKey={bundleKey}
          >
            <I18nextProvider i18n={i18n} />
            <View />
          </ServerContextProvider>
        </StyleRegistry>
      );

      // Some server side components are using dangerouslySetInnerHTML to render their content,
      // we need to clean the output to avoid having unwanted divs in the final output (e.g. <unwanteddiv>content</unwanteddiv>)
      const cleanedRenderedElement = ReactDOMServer.renderToString(element)
        .replace(/<unwanteddiv>/g, "")
        .replace(/<\/unwanteddiv>/g, "");

      const styles = ReactDOMServer.renderToStaticMarkup(styleRegistry.styles());
      const stylesResource = styles
        ? `<jahia:resource type="inline" key="styles${currentNode.getIdentifier()}">${styles}</jahia:resource>`
        : "";
      if (currentResource.getContextConfiguration() === "page") {
        // Set the HTML5 doctype that can't be rendered in JSX
        return `<!DOCTYPE html>${cleanedRenderedElement}${stylesResource}`;
      }

      return `${cleanedRenderedElement}${stylesResource}`;
    },
  });
};
