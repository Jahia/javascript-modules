import type { JCRNodeWrapper } from "org.jahia.services.content";
import { getNodeProps } from "../jcr/getNodeProps";
import { buildNodeUrl } from "../urlBuilder/urlBuilder";

/** Attributes to spread on an `<img>`. Flat, so it can cross into an Island. */
export interface ImageProps {
  src: string;
  alt: string;
  width: number | undefined;
  height: number | undefined;
}

/** Returns a valid dimension or `undefined`. */
const toDimension = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;

/**
 * Builds the attributes of an `<img>` for an image node.
 *
 * `width` and `height` come from `jmix:image`, and are what stops the image from shifting the page
 * as it loads.
 */
export function getImageProps(
  node: JCRNodeWrapper,
  options: {
    /** Defaults to the image's title. Set to `""` for a decorative image. */
    alt?: string;
    /** Rendered width in CSS pixels, scaling `height` with it. Defaults to the image's own. */
    width?: number;
    /**
     * Rendered height in CSS pixels, scaling `width` with it. Defaults to the image's own.
     *
     * If `width` is also set, both values will be preserved and the aspect ratio will be ignored.
     */
    height?: number;
    /** Prefix the URL with `http(s)://host`. Set to a string to specify the origin explicitly. */
    absolute?: boolean | string;
  },
): ImageProps {
  const src = buildNodeUrl(node, { absolute: options.absolute });

  // We'll be super conservative here
  const props = getNodeProps<{ "jcr:title": unknown; "j:width": unknown; "j:height": unknown }>(
    node,
    ["jcr:title", "j:width", "j:height"],
  );

  const alt = options.alt ?? String(props["jcr:title"] || "");

  const intrinsicWidth = toDimension(props["j:width"]);
  const intrinsicHeight = toDimension(props["j:height"]);

  // Consider intrinsic dimensions if both are defined; discard if one is missing
  const hasIntrinsicDimensions = intrinsicWidth !== undefined && intrinsicHeight !== undefined;

  // Calculate the final size preserving the aspect ratio if only one dimension is provided
  const width =
    options.width ??
    (hasIntrinsicDimensions
      ? typeof options.height === "number"
        ? Math.round((intrinsicWidth * options.height) / intrinsicHeight)
        : intrinsicWidth
      : undefined);
  const height =
    options.height ??
    (hasIntrinsicDimensions
      ? typeof options.width === "number"
        ? Math.round((intrinsicHeight * options.width) / intrinsicWidth)
        : intrinsicHeight
      : undefined);

  return {
    src,
    alt,
    width,
    height,
  };
}
