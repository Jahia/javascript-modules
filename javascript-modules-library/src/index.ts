// Rendering components
export { RenderInBrowser } from "./core/server/components/render/RenderInBrowser.js";
export { HydrateInBrowser } from "./core/server/components/render/HydrateInBrowser.js";
export { Render } from "./core/server/components/render/Render.js";
export { RenderChild } from "./core/server/components/render/RenderChild.js";
export { RenderChildren } from "./core/server/components/render/RenderChildren.js";

// Components
export { AbsoluteArea } from "./core/server/components/AbsoluteArea.js";
export { AddContentButtons } from "./core/server/components/AddContentButtons.js";
export { AddResources } from "./core/server/components/AddResources.js";
export { Area } from "./core/server/components/Area.js";

// Declaration and registration
export { defineJahiaComponent } from "./core/server/framework/defineJahiaComponent.js";
export { jahiaComponent } from "./core/server/framework/jahiaComponent.js";
export { registerJahiaComponents } from "./core/server/framework/register.js";

// Hooks
export { useGQLQuery } from "./core/server/hooks/useGQLQuery.js";
export { useJCRQuery } from "./core/server/hooks/useJCRQuery.js";
export { useServerContext, ServerContextProvider } from "./core/server/hooks/useServerContext.js";

// JCR utils
export { getChildNodes } from "./core/server/utils/jcr/getChildNodes.js";
export { getNodeProps } from "./core/server/utils/jcr/getNodeProps.js";
export { getNodesByJCRQuery } from "./core/server/utils/jcr/getNodesByJCRQuery.js";

// URL builder
export {
  buildEndpointUrl,
  buildNodeUrl,
  buildModuleFileUrl,
  initUrlBuilder,
} from "./core/server/utils/urlBuilder/urlBuilder.js";

// I18n
export { getSiteLocales } from "./core/server/utils/i18n.js";

// Navigation
export { buildNavMenu } from "./nav/server/navBuilder/navBuilder.js";
export type { MenuEntry } from "./nav/server/navBuilder/navBuilder.js";

// Re-export Java helpers
export { default as server } from "virtual:jahia-server";
