// Rendering components
export { Island } from "./components/render/Island.js";
export { Render, type VirtualJCRNode } from "./components/render/Render.js";
export { RenderChild } from "./components/render/RenderChild.js";
export { RenderChildren } from "./components/render/RenderChildren.js";

// Components
export { AbsoluteArea } from "./components/AbsoluteArea.js";
export { AddContentButtons } from "./components/AddContentButtons.js";
export { AddResources } from "./components/AddResources.js";
export { Area } from "./components/Area.js";
export {
  JImage,
  type ExtraImageAttributes,
  type JImageBaseProps,
  type JImageProps,
  type MarkupBox,
} from "./components/JImage.js";
export { JLink, type ExtraAnchorAttributes, type JLinkProps } from "./components/JLink.js";

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
export { readNodeReference, type NodeReference } from "./utils/jcr/readNodeReference.js";

// URL builder
export {
  buildEndpointUrl,
  buildNodeUrl,
  buildModuleFileUrl,
  type AbsoluteUrlOption,
} from "./utils/urlBuilder/urlBuilder.js";

// Images
export {
  buildBackgroundImageUrl,
  buildImageUrl,
  buildThumbnailUrl,
  THUMBNAIL_WIDTHS,
  type ImageResizeChannel,
  type ImageUrl,
  type ImageUrlOptions,
} from "./utils/image/buildImageUrl.js";
export {
  getImageProps,
  inspectImageChannel,
  DEFAULT_BREAKPOINTS,
  type ImageLayout,
  type ImageOptions,
  type ImageOptionsBase,
  type ImageSlot,
  type ImgProps,
} from "./utils/image/getImageProps.js";
export {
  setImageDefaults,
  type ImageContext,
  type ImageDefaults,
  type ImageLoader,
  type ImageLoaderProps,
  type ImageSourceOptions,
} from "./utils/image/imageDefaults.js";
export { readImageMeta, type ImageMeta } from "./utils/image/imageMeta.js";

// Links
export { getLinkProps } from "./utils/link/getLinkProps.js";
export {
  setLinkDefaults,
  DEFAULT_ALLOWED_SCHEMES,
  type LinkDefaults,
} from "./utils/link/linkDefaults.js";
export { resolveContentLink, type LinkLabelSource } from "./utils/link/resolveContentLink.js";
export type {
  AnchorProps,
  LinkContext,
  LinkOptions,
  LinkProps,
  LinkState,
  LinkTarget,
  LinkTargetAttribute,
} from "./utils/link/types.js";

// I18n
export { getSiteLocales } from "./utils/i18n.js";

// Re-export Java helpers
// `server` is a global variable, but it is less surprising to be able to import it from the library
// ...and removing it would be a breaking change...
// We need the intermediate variable because only local vars can be exported
const localServer = server;
export { localServer as server };
