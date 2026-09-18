import type { JCRNodeWrapper } from "org.jahia.services.content";
import { getNodeProps } from "../jcr/getNodeProps";
import { buildNodeUrl } from "../urlBuilder/urlBuilder";

export interface FixedSizeOptions {
  /** Defaults to the image's title. Set to `""` for a decorative image. */
  alt?: string;
  /** Prefix the URL with `http(s)://host`. Set to a string to specify the origin explicitly. */
  absolute?: boolean | string;
  /** Loading strategy for the image. Defaults to `"lazy"`. */
  loading?: "lazy" | "eager";
  /** Rendered width in CSS pixels, scaling `height` with it. Defaults to the image's own. */
  width?: number;
  /**
   * Rendered height in CSS pixels, scaling `width` with it. Defaults to the image's own.
   *
   * If `width` is also set, both values will be preserved and the aspect ratio will be ignored. The
   * image might be cropped or distorted depending on the image provider.
   */
  height?: number;
}

export interface ResponsiveOptions {
  /** Defaults to the image's title. Set to `""` for a decorative image. */
  alt?: string;
  /** Prefix the URL with `http(s)://host`. Set to a string to specify the origin explicitly. */
  absolute?: boolean | string;
  /** Loading strategy for the image. Defaults to `"lazy"`. */
  loading?: "lazy" | "eager";
  /**
   * Array of image widths for the `srcset` attribute.
   *
   * @default [2048, 1680, 1366, 724, 424, 376]
   */
  srcSet?: number[];
  /**
   * Breakpoints for the responsive image.
   *
   * @example
   *   [
   *     "(width >= 1200px) 600px", // Big screens: central 1200px layout, 2 columns, image in one
   *     "(width >= 600px) 50vw", // 600px breakpoint, 2 columns, image in one
   *     "100vw", // Small screens: full-width image
   *   ];
   *
   * @default loading === "lazy" ? ["auto", "100vw"] : ["100vw"]
   */
  sizes?: string[];
}

/** @internal */
export interface MergedOptions {
  alt?: string;
  absolute?: boolean | string;
  loading?: "lazy" | "eager";
  width?: number;
  height?: number;
  srcSet?: number[];
  sizes?: string[];
}

/** Attributes to spread on an `<img>`. Flat, so it can cross into an Island. */
export interface ImageProps {
  src: string;
  srcSet?: string;
  alt: string;
  width?: number;
  height?: number;
  loading: "eager" | "lazy";
  sizes?: string;
}

/** Returns a valid dimension or `undefined`. */
const toDimension = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.ceil(value) : undefined;

const isVector = (node: JCRNodeWrapper) => {
  if (!node.hasNode("jcr:content")) return false;
  const mimeType = node.getNode("jcr:content").getPropertyAsString("jcr:mimeType");
  return typeof mimeType === "string" && mimeType.startsWith("image/svg");
};

/** Workaround for https://github.com/Jahia/jahia/issues/23 */
const encodeComma = (url: string) => url.replaceAll(",", "%2C");

/**
 * There is no real way to know what will resize the image, so we make this assumption:
 *
 * - If a DAM is set (node.getProvider().isDefault() === false), the DAM will resize the image
 * - Otherwise, a page filter will rewrite the image URL to for resizing
 */
const resizedUrl = (
  node: JCRNodeWrapper,
  args: { w?: string; h?: string },
  options: Parameters<typeof buildNodeUrl>[1],
) =>
  encodeComma(
    buildNodeUrl(
      node,
      node.getProvider().isDefault() ? { ...options, parameters: args } : { ...options, args },
    ),
  );

/**
 * Default set of image widths for the `srcset` attribute.
 *
 * 724 for Lighthouse (412x823, DPR 1.75) plus the recommended breakpoints from
 * https://webmasters.stackexchange.com/questions/132311/how-do-you-determine-a-good-set-of-breakpoints-for-srcset-image-sizes
 */
const defaultSrcSet = [2048, 1680, 1366, 724, 424, 376] as const;

/** Builds the attributes of an `<img>` for an image node. */
export function getImageProps(node: JCRNodeWrapper, options?: FixedSizeOptions): ImageProps;
export function getImageProps(node: JCRNodeWrapper, options?: ResponsiveOptions): ImageProps;
export function getImageProps(node: JCRNodeWrapper, options: MergedOptions = {}): ImageProps {
  const loading = options.loading ?? "lazy";

  // We'll be super conservative here, props might be missing or malformed
  const props = getNodeProps<{
    "jcr:title": unknown;
    "j:width": unknown;
    "j:height": unknown;
  }>(node, ["jcr:title", "j:width", "j:height"]);

  const alt = options.alt ?? String(props["jcr:title"] || "");
  const optionWidth = toDimension(options.width);
  const optionHeight = toDimension(options.height);

  // Nothing more to do for vector images
  if (isVector(node)) {
    const src = buildNodeUrl(node, { absolute: options.absolute });
    return { src, alt, width: optionWidth, height: optionHeight, loading };
  }

  // We enter the lands of responsive images
  // Work here is based on https://piccalil.li/blog/the-end-of-responsive-images/

  const intrinsicWidth = toDimension(props["j:width"]);
  const intrinsicHeight = toDimension(props["j:height"]);

  // Consider intrinsic dimensions if both are defined; discard if one is missing
  const hasIntrinsicDimensions = intrinsicWidth !== undefined && intrinsicHeight !== undefined;

  // If a width or a height is explicitly set, generate "x" (pixel density) descriptors
  if (optionWidth !== undefined || optionHeight !== undefined) {
    // Generate 4x to 1x density descriptors for the srcset
    const s = optionWidth ?? optionHeight!;
    let sizes = [4 * s, 3 * s, 2 * s, Math.ceil(1.5 * s), s];

    // If the image has intrinsic dimensions, ensure the generated sizes do not exceed them
    if (hasIntrinsicDimensions) {
      if (optionWidth !== undefined) {
        sizes = sizes.filter((size) => size <= intrinsicWidth);

        // If the array ends up empty (`options.width` bigger than the intrinsic width), prepend the intrinsic width
        if (sizes.length === 0) sizes.unshift(intrinsicWidth);
      } else if (optionHeight !== undefined) {
        sizes = sizes.filter((size) => size <= intrinsicHeight);

        if (sizes.length === 0) sizes.unshift(intrinsicHeight);
      }
    }

    const width =
      optionWidth ??
      (hasIntrinsicDimensions
        ? optionHeight === undefined
          ? intrinsicWidth
          : Math.ceil((intrinsicWidth * optionHeight) / intrinsicHeight)
        : undefined);
    const height =
      optionHeight ??
      (hasIntrinsicDimensions
        ? optionWidth === undefined
          ? intrinsicHeight
          : Math.ceil((intrinsicHeight * optionWidth) / intrinsicWidth)
        : undefined);

    // Bail early if we only have one option (can happen when `optionWidth` > `intrinsicWidth`)
    if (sizes.length === 1) {
      return {
        src: buildNodeUrl(node, { absolute: options.absolute }),
        alt,
        width,
        height,
        loading,
      };
    }

    // At this point we have a fancy srcset with multiple density descriptors to offer

    /** Small util to map a size to a w/h query parameter object */
    const sizeToArg =
      optionWidth !== undefined
        ? optionHeight !== undefined
          ? (size: number) => ({
              w: String(size),
              // When both `optionWidth` and `optionHeight` are provided, preserve the requested aspect ratio
              h: String(Math.ceil((size * optionHeight!) / optionWidth!)),
            })
          : (size: number) => ({ w: String(size) })
        : (size: number) => ({ h: String(size) });

    // Use the lowest density as the default `src` and provide the rest in the `srcset` attribute
    const src = resizedUrl(node, sizeToArg(sizes[sizes.length - 1]), {
      absolute: options.absolute,
    });
    const srcSet = sizes
      .map(
        (size) =>
          `${resizedUrl(node, sizeToArg(size), {
            absolute: options.absolute,
            autocollectDependency: false,
          })} ${(size / s).toFixed(1)}x`,
      )
      .join(", ");

    return { src, srcSet, alt, width, height, loading };
  }

  // Otherwise generate "w" (width) descriptors for the srcset

  // List of widths to generate
  let widths = options.srcSet?.concat().sort((a, z) => z - a) ?? [...defaultSrcSet];

  // If widths is empty, bail early
  if (widths.length === 0) {
    return {
      src: buildNodeUrl(node, { absolute: options.absolute }),
      alt,
      width: intrinsicWidth,
      height: intrinsicHeight,
      loading,
    };
  }

  if (hasIntrinsicDimensions) {
    const max = Math.max(...widths);

    widths = widths.filter((width) => width < intrinsicWidth);

    // If the original image is smaller than the largest requested width (e.g. 2048px),
    // add the original image width to the beginning of the array
    if (intrinsicWidth <= max) widths.unshift(intrinsicWidth);
  }

  const sizes = options.sizes ? [...options.sizes] : [];

  // Ensure auto is the first value if unset when `loading` is `lazy`
  if (loading === "lazy") {
    if (sizes.length === 0) sizes.push("100vw");
    if (sizes[0] !== "auto") sizes.unshift("auto");
  } else if (loading === "eager" && sizes.length === 0) {
    sizes.push("100vw");
  }

  // Use the smallest image as a default `src` for the `img` element
  const src = resizedUrl(
    node,
    { w: String(widths[widths.length - 1]) },
    { absolute: options.absolute },
  );
  const srcSet =
    widths.length > 1
      ? widths
          .map(
            (width) =>
              `${resizedUrl(
                node,
                { w: String(width) },
                { absolute: options.absolute, autocollectDependency: false },
              )} ${width}w`,
          )
          .join(", ")
      : undefined;

  return {
    src,
    srcSet,
    alt,
    width: intrinsicWidth,
    height: intrinsicHeight,
    loading,
    sizes: srcSet === undefined ? undefined : sizes.join(", "),
  };
}
