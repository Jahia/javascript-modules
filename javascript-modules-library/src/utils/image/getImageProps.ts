import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { RenderContext } from "org.jahia.services.render";
import { useServerContext } from "../../hooks/useServerContext";
import { getNodeProps } from "../jcr/getNodeProps";
import { buildNodeUrl } from "../urlBuilder/urlBuilder";
// import {ImgHTMLAttributes} from 'react'

/** Attributes to spread on an `<img>`. Flat, so it can cross into an Island. */
export interface ImageProps {
  src: string;
  width?: number;
  height?: number;
  alt: string;
  loading: "lazy" | "eager";
}

/**
 * Builds the attributes of an `<img>` for an image node.
 *
 * `width` and `height` come from `jmix:image`, and are what stops the image from shifting the page
 * as it loads.
 */
export function getImageProps(
  node: JCRNodeWrapper,
  options: {
    /** Pass `""` for a decorative image, so the omission is a decision. */
    alt: string;
    /** Rendered width in CSS pixels, scaling `height` with it. Defaults to the image's own. */
    width?: number;
    /** Above the fold: loads eagerly. */
    priority?: boolean;
    /** Prefix the URL with `http(s)://host`. Set to a string to specify the origin explicitly. */
    absolute?: boolean | string;
  },
  context: { renderContext?: RenderContext } = useServerContext(),
): ImageProps {
  const { alt, width, priority, absolute } = options;
  const size = getNodeProps<{ "j:width"?: number; "j:height"?: number }>(node, [
    "j:width",
    "j:height",
  ]);

  return {
    src: buildNodeUrl(node, { absolute }, context),
    ...(size["j:width"] &&
      size["j:height"] && {
        width: width ?? size["j:width"],
        height: width ? Math.round((width * size["j:height"]) / size["j:width"]) : size["j:height"],
      }),
    alt,
    loading: priority ? "eager" : "lazy",
  };
}
