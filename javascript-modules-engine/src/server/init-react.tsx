import { ServerContextProvider } from "@jahia/javascript-modules-library";
import i18n from "i18next";
import type { RenderContext, Resource } from "org.jahia.services.render";
import type { Bundle } from "org.osgi.framework";
import type { ComponentType } from "react";
import { renderToReadableStream } from "react-dom/server.edge";
import { I18nextProvider } from "react-i18next";

// @ts-expect-error Retrieve a Java object
const CompletableFuture = Java.type("java.util.concurrent.CompletableFuture");

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
    const tree = (
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

    const completable = new CompletableFuture();

    // Render the tree to a stream, then collect the stream in a string
    renderToReadableStream(tree).then(async (stream) => {
      console.log("Stream created");
      // Wait for all nested components to be rendered
      await stream.allReady;

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let { done, value } = await reader.read();

      let html = "";
      while (!done) {
        html += decoder.decode(value);
        ({ done, value } = await reader.read());
      }

      console.log("Rendered HTML:", html);
      completable.complete(html);
    });

    // @ts-expect-error Oops
    return completable.get(5, Java.type("java.util.concurrent.TimeUnit").SECONDS);
  },
});
