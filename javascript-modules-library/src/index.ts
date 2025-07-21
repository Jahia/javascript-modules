// Rendering components
export { RenderInBrowser } from "./components/render/RenderInBrowser.js";
export { HydrateInBrowser } from "./components/render/HydrateInBrowser.js";
export { Render } from "./components/render/Render.js";
export { RenderChild } from "./components/render/RenderChild.js";
export { RenderChildren } from "./components/render/RenderChildren.js";

// Components
export { AbsoluteArea } from "./components/AbsoluteArea.js";
export { AddContentButtons } from "./components/AddContentButtons.js";
export { AddResources } from "./components/AddResources.js";
export { Area } from "./components/Area.js";

// Declaration and registration
export { jahiaComponent } from "./framework/jahiaComponent.js";

// Hooks
export { useGQLQuery } from "./hooks/useGQLQuery.js";
export { useJCRQuery } from "./hooks/useJCRQuery.js";
export { useServerContext, ServerContextProvider } from "./hooks/useServerContext.js";

// JCR utils
export { getChildNodes } from "./utils/jcr/getChildNodes.js";
export { getNodeProps } from "./utils/jcr/getNodeProps.js";
export { getNodesByJCRQuery } from "./utils/jcr/getNodesByJCRQuery.js";

// URL builder
export {
  buildEndpointUrl,
  buildNodeUrl,
  buildModuleFileUrl,
  initUrlBuilder,
} from "./utils/urlBuilder/urlBuilder.js";

// I18n
export { getSiteLocales } from "./utils/i18n.js";

// Re-export Java helpers
export { default as server } from "virtual:jahia-server";
