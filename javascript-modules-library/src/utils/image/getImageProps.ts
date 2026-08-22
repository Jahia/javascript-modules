import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { RenderContext, Resource } from "org.jahia.services.render";
import { buildImageUrl, type ImageResizeChannel } from "./buildImageUrl.js";
import { clampToIntrinsic, readImageMeta } from "./imageMeta.js";

/**
 * How the image occupies its slot. Declaring the intent lets the library derive both `srcSet` and
 * `sizes`, which is otherwise the part of responsive images that every call site gets wrong.
 *
 * - `constrained` (default): the image is at most `width` CSS pixels wide and shrinks with the
 *   viewport below that — the common case for content in a column.
 * - `fixed`: the image is always `width` CSS pixels wide (an avatar, a logo slot, a card thumbnail in
 *   a fixed grid).
 * - `full-width`: the image always spans the viewport (a hero).
 */
export type ImageLayout = "constrained" | "fixed" | "full-width";

/**
 * Candidate widths, in image pixels, used when the layout can stretch.
 *
 * A ladder, not a set of breakpoints: candidates describe how large the _file_ can be, while
 * `sizes` describes the _slot_, so the two do not have to line up. Doubling steps keep the ladder
 * short while covering high-density screens.
 */
export const DEFAULT_BREAKPOINTS: readonly number[] = [320, 640, 960, 1280, 1920, 2560];

/**
 * `<img>` props built from a JCR image node.
 *
 * Plain, serializable data on purpose: this is also the shape to pass through `<Island>` props,
 * where a React element cannot travel.
 */
export interface ImageProps {
  src: string;
  srcSet?: string;
  sizes?: string;
  /** Intrinsic width in image pixels, when Jahia extracted it. Reserves space, preventing CLS. */
  width?: number;
  /** Intrinsic height in image pixels, when Jahia extracted it. */
  height?: number;
  /**
   * Alternative text. Required — an image that carries no information for a screen reader is
   * declared with `alt=""`, explicitly.
   */
  alt: string;
}

export interface ImageOptions {
  /** Alternative text; `""` declares the image decorative. */
  alt: string;
  /**
   * How the image occupies its slot.
   *
   * @default "constrained"
   */
  layout?: ImageLayout;
  /** The slot width in CSS pixels. Required by `constrained` and `fixed`. */
  width?: number;
  /** Explicit candidate widths in image pixels. Escape hatch: prefer `layout` + `width`. */
  widths?: number[];
  /** Explicit `sizes` attribute. Escape hatch: prefer `layout` + `width`. */
  sizes?: string;
  /** Candidate ladder used by `constrained` and `full-width`. */
  breakpoints?: readonly number[];
  /**
   * Register a render cache dependency on the image node, so that editing the image flushes the
   * fragments that display it. Turn it off only when the caller registers it itself.
   *
   * @default true
   */
  cacheDependency?: boolean;
}

/**
 * Commas are legal inside a URL but ambiguous with the `srcSet` candidate separator, and Jahia's
 * srcset rewriter splits on every comma — corrupting, for instance, a Cloudinary transformation URL
 * (`…/upload/f_auto,w_600/…`). Percent-encoding them inside `srcSet` only keeps both readers
 * happy.
 *
 * @see {@link https://github.com/Jahia/jahia/issues/23}
 */
const srcSetSafe = (url: string) => url.replaceAll(",", "%2C");

/** The candidate widths a layout asks for, before clamping. */
const candidateWidths = (
  layout: ImageLayout,
  width: number | undefined,
  breakpoints: readonly number[],
): number[] => {
  if (layout === "full-width") return [...breakpoints];

  if (width === undefined) {
    throw new Error(
      `getImageProps: layout "${layout}" needs a width (the slot width in CSS pixels). ` +
        `Use layout "full-width" for an image that always spans the viewport.`,
    );
  }

  // Two device-pixel ratios cover the realistic range; a 3x file is rarely worth its bytes
  const densities = [width, width * 2];
  if (layout === "fixed") return densities;

  // Constrained: the slot shrinks with the viewport, so smaller files are useful too
  return [...breakpoints.filter((candidate) => candidate < width), ...densities];
};

/** The `sizes` attribute a layout implies. */
const derivedSizes = (layout: ImageLayout, width: number | undefined): string => {
  switch (layout) {
    case "full-width":
      return "100vw";
    case "fixed":
      return `${width}px`;
    case "constrained":
      return `(min-width: ${width}px) ${width}px, 100vw`;
  }
};

/**
 * Builds `<img>` props from a Jahia image node: a resized `src`, a `srcSet` of candidates, the
 * matching `sizes`, and the intrinsic dimensions.
 *
 * Declare how the image sits in the page with `layout` + `width` and the candidates and `sizes` are
 * derived; `widths` and `sizes` remain available for the cases that need exact control.
 *
 * @example
 *   ```tsx
 *   <img {...getImageProps(node, { alt: "Bay view from the terrace", width: 400 })} />
 *   ```;
 *
 * @param node - The file node holding the image.
 * @param options - Alternative text (required) and how the image is laid out.
 * @param context - Provided by React context on the server; pass one when calling outside a render.
 * @returns Plain, serializable `<img>` props — safe to pass through `<Island>` props.
 * @see {@link Image} for the component that renders these props.
 */
export function getImageProps(
  node: JCRNodeWrapper,
  options: ImageOptions,
  context?: { renderContext?: RenderContext; currentResource?: Resource },
): ImageProps {
  const {
    alt,
    layout = "constrained",
    width,
    widths,
    sizes,
    breakpoints = DEFAULT_BREAKPOINTS,
    cacheDependency = true,
  } = options;

  const meta = readImageMeta(node);
  const renderContext = context?.renderContext;
  if (cacheDependency && renderContext) {
    server.render.addCacheDependency({ node }, renderContext);
  }

  const base = {
    alt: alt.trim(),
    width: meta.intrinsicWidth,
    height: meta.intrinsicHeight,
  };

  // A vector needs no candidates: one resolution-independent file serves every slot
  if (meta.vector) {
    return { ...base, src: buildImageUrl(node, undefined, { meta, context }).url };
  }

  const requested = (widths ?? candidateWidths(layout, width, breakpoints))
    .filter((candidate) => candidate > 0)
    .map((candidate) => clampToIntrinsic(candidate, meta.intrinsicWidth))
    .sort((a, b) => a - b);

  // The original joins the ladder only when it is close to the largest candidate: an 8000px master
  // must never be served into a 1536px slot, but a 2000px original is a useful top candidate.
  const largest = requested.at(-1);
  if (meta.intrinsicWidth && largest && meta.intrinsicWidth <= 2 * largest) {
    requested.push(meta.intrinsicWidth);
  }

  // One candidate per distinct URL, keeping the SMALLEST width that produced it. A provider may
  // collapse several requested widths onto one rendition; under-claiming its width makes the
  // browser climb to a bigger candidate rather than paint an upscaled one.
  const widthByUrl = new Map<string, number>();
  for (const candidate of requested) {
    const { url } = buildImageUrl(node, { width: candidate }, { meta, context });
    if (!widthByUrl.has(url)) widthByUrl.set(url, candidate);
  }

  const [smallest] = [...widthByUrl.keys()];
  return {
    ...base,
    src: smallest ?? buildImageUrl(node, undefined, { meta, context }).url,
    srcSet:
      widthByUrl.size > 1
        ? [...widthByUrl].map(([url, candidate]) => `${srcSetSafe(url)} ${candidate}w`).join(", ")
        : undefined,
    sizes: widthByUrl.size > 1 ? (sizes ?? derivedSizes(layout, width)) : sizes,
  };
}

/**
 * Which channel each candidate of an image would use — the answer to "why does resizing do nothing
 * on my machine?". A plain instance reports `query` for anything but the pre-generated thumbnails,
 * meaning the URLs carry a size hint that only Media Optimization (on Jahia Cloud, in live mode)
 * interprets.
 *
 * @param node - The file node holding the image.
 * @param width - The width to inspect.
 * @returns The channel that would carry that width.
 * @see {@link ImageResizeChannel}
 */
export function inspectImageChannel(node: JCRNodeWrapper, width: number): ImageResizeChannel {
  return buildImageUrl(node, { width }).channel;
}
