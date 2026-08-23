import type { JCRNodeWrapper } from "org.jahia.services.content";
import { buildModuleFileUrl } from "../urlBuilder/urlBuilder.js";
import {
  buildImageUrl,
  commaSafe,
  type ImageResizeChannel,
  type ImageUrlOptions,
} from "./buildImageUrl.js";
import { warnIgnoredResize, warnMissingIntrinsicSize } from "./devWarnings.js";
import {
  resolveImageDefaults,
  type ImageContext,
  type ImageSourceOptions,
} from "./imageDefaults.js";
import { clampToIntrinsic, readImageMeta } from "./imageMeta.js";

/**
 * How the image occupies its slot. Declaring the intent lets the library derive both `srcSet` and
 * `sizes`, which is otherwise the part of responsive images that every call site gets wrong.
 *
 * The first question is not how wide the slot is, it is whether anything in the markup _knows_ how
 * wide it is — and, when nothing does, whether the image sits in the normal flow or is stretched
 * over a parent.
 *
 * - `constrained` (default): the image is at most `slotWidth` CSS pixels wide and shrinks with the
 *   viewport below that — the common case for content in a column.
 * - `fixed`: the image is always `slotWidth` CSS pixels wide (an avatar, a logo slot, a card
 *   thumbnail in a fixed grid).
 * - `fluid`: a normal-flow slot whose width the markup cannot know — a `%`, a `fr`, a grid cell, an
 *   `aspect-ratio` box, a slot constrained by its height. No `slotWidth`, and `sizes` is required
 *   because nothing else can describe the box. On a fluid design this is most slots.
 * - `full-width`: the image always spans the viewport (a hero, a full-bleed banner).
 * - `fill`: the image is positioned _over_ its closest positioned ancestor, which owns the box. Like
 *   `fluid` it needs a `sizes`, and unlike every other layout it carries CSS of its own and drops
 *   the intrinsic dimensions, which would fight that parent.
 */
export type ImageLayout = "constrained" | "fixed" | "fluid" | "full-width" | "fill";

/**
 * Candidate file widths, in image pixels, offered for the layouts where the slot is not a single
 * number — `constrained` below its maximum, `fluid`, `full-width` and `fill` always. A `fixed` slot
 * never uses them: its width and that width doubled cover it.
 *
 * These are widths of _files_, not breakpoints of the layout: the slot is described by `sizes`, and
 * the browser matches one against the other at load time. Doubling-ish steps keep the ladder short,
 * because a candidate only pays for itself if it is meaningfully smaller than the next one up.
 */
export const DEFAULT_BREAKPOINTS: readonly number[] = [320, 640, 960, 1280, 1920, 2560];

/**
 * The layouts whose slot width nothing in the markup states, so no `sizes` can be derived for them
 * and the caller has to supply one. An unset layout is `constrained`, which derives its own.
 */
export const layoutNeedsSizes = (layout: ImageLayout | undefined): boolean =>
  layout === "fluid" || layout === "fill";

/**
 * `<img>` props built from a JCR image node.
 *
 * Plain, serializable data on purpose: this is also the shape to pass through `<Island>` props,
 * where a React element cannot travel.
 */
export interface ImgProps {
  src: string;
  srcSet?: string;
  sizes?: string;
  /** Intrinsic width in image pixels, when Jahia extracted it. Reserves space, preventing CLS. */
  width?: number;
  /** Intrinsic height in image pixels, when Jahia extracted it. */
  height?: number;
  /**
   * Set to `"lazy"` when `sizes` resolves to `auto`, which browsers only honour on a lazily loaded
   * image. Render it — dropping it turns `auto` into `100vw` and downloads the largest candidate.
   */
  loading?: "lazy" | "eager";
  /**
   * Alternative text. Required — an image that carries no information for a screen reader is
   * declared with `alt=""`, explicitly.
   */
  alt: string;
}

export interface ImageOptions extends ImageSourceOptions {
  /** Alternative text; `""` declares the image decorative. */
  alt: string;
  /**
   * How the image occupies its slot.
   *
   * @default "constrained"
   */
  layout?: ImageLayout;
  /**
   * The slot width in CSS pixels. Required by `constrained` and `fixed`, meaningless for the
   * layouts whose width the markup does not state.
   *
   * Named apart from the `width` HTML attribute on purpose: this is how much room the layout gives
   * the image, not a number that ends up in the markup.
   */
  slotWidth?: number;
  /** Explicit candidate widths in image pixels. Overrides the ladder the layout would derive. */
  widths?: number[];
  /**
   * Explicit `sizes` attribute. Required by the `fluid` and `fill` layouts.
   *
   * `"auto"` lets the browser measure the real box, which beats any value derivable from the markup
   * — and it forces `loading="lazy"`, the only mode in which browsers read it.
   */
  sizes?: string;
  /** Candidate ladder used by every layout but `fixed`. */
  breakpoints?: readonly number[];
  /**
   * Register a render cache dependency on the image node, so that editing the image flushes the
   * fragments that display it. Turn it off only when the caller registers it itself.
   *
   * @default true
   */
  cacheDependency?: boolean;
  /**
   * A module static asset (`import placeholder from "/static/img/placeholder.jpg"`) used when there
   * is no `node`, so an unfilled content property does not leave a broken image. Without one, a
   * missing node returns `null`.
   */
  fallback?: string;
}

/**
 * True for a `sizes` value whose first entry is `auto`.
 *
 * The spec allows a fallback after it (`"auto, 50vw"`) for browsers that do not implement it, so
 * the marker is the first entry rather than the whole string.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img#sizes}
 */
export const isAutoSizes = (sizes: string | undefined): boolean =>
  sizes !== undefined && sizes.trim().split(",")[0].trim().toLowerCase() === "auto";

/** The `slotWidth` the layouts measured in CSS pixels cannot work without. */
const requireSlotWidth = (layout: ImageLayout, slotWidth: number | undefined): number => {
  if (slotWidth === undefined) {
    throw new Error(
      `getImageProps: layout "${layout}" needs a slotWidth (the slot width in CSS pixels). ` +
        `Use layout "fluid" when the slot is sized by CSS the markup cannot read, or ` +
        `"full-width" for an image that always spans the viewport.`,
    );
  }

  return slotWidth;
};

/** The candidate widths a layout asks for, before clamping. */
const candidateWidths = (
  layout: ImageLayout,
  slotWidth: number | undefined,
  breakpoints: readonly number[],
): number[] => {
  // The slot is the viewport, or a box the markup cannot measure: offer the whole ladder
  if (layout === "full-width" || layoutNeedsSizes(layout)) return [...breakpoints];

  const width = requireSlotWidth(layout, slotWidth);

  // Two device-pixel ratios cover the realistic range; a 3x file is rarely worth its bytes
  const densities = [width, width * 2];
  if (layout === "fixed") return densities;

  // Constrained: the slot shrinks with the viewport, so smaller files are useful too
  return [...breakpoints.filter((candidate) => candidate < width), ...densities];
};

/**
 * The `sizes` attribute a layout implies.
 *
 * Reached both from the layouts that derive one and, when `widths` was explicit and no ladder was
 * asked for, from a caller who never named a slot — so it validates `slotWidth` itself rather than
 * trusting {@link candidateWidths} to have run first.
 */
const derivedSizes = (layout: ImageLayout, slotWidth: number | undefined): string => {
  switch (layout) {
    case "full-width":
      return "100vw";
    case "fixed":
      return `${requireSlotWidth(layout, slotWidth)}px`;
    case "constrained": {
      const width = requireSlotWidth(layout, slotWidth);
      return `(min-width: ${width}px) ${width}px, 100vw`;
    }
    case "fluid":
    case "fill":
      throw new Error(
        `getImageProps: layout "${layout}" needs an explicit sizes, because the slot is sized by ` +
          "CSS and nothing in the markup says how wide it is. " +
          'Use sizes="auto" to let the browser measure the real box (it loads the image lazily), ' +
          'or describe the slot, as in sizes="(min-width: 60rem) 33vw, 100vw".',
      );
  }
};

/**
 * Builds `<img>` props from a Jahia image node: a resized `src`, a `srcSet` of candidates, the
 * matching `sizes`, and the intrinsic dimensions.
 *
 * Declare how the image sits in the page with `layout` + `slotWidth` and the candidates and `sizes`
 * are derived; on a fluid layout, where no slot has a width in CSS pixels, use `layout="fluid"`
 * with `sizes="auto"` — that is the normal case, not the escape hatch.
 *
 * @example
 *   ```tsx
 *   const context = useServerContext();
 *   <img {...getImageProps(node, { alt: "Bay view", slotWidth: 400 }, context)} />
 *   <img {...getImageProps(node, { alt: "", layout: "fluid", sizes: "auto" }, context)} />
 *   ```;
 *
 * @param node - The file node holding the image. When missing, `options.fallback` is used instead.
 * @param options - Alternative text (required) and how the image is laid out.
 * @param context - The render context, from `useServerContext()`. It carries the cache dependency
 *   and selects the module whose {@link setImageDefaults} apply, so a call without it silently loses
 *   both.
 * @returns Plain, serializable `<img>` props — safe to pass through `<Island>` props — or `null`
 *   when there is neither a node nor a fallback.
 * @see {@link JImage} for the component that renders these props.
 */
export function getImageProps(
  node: JCRNodeWrapper,
  options: ImageOptions,
  context: ImageContext,
): ImgProps;
export function getImageProps(
  node: JCRNodeWrapper | null | undefined,
  options: ImageOptions & { fallback: string },
  context: ImageContext,
): ImgProps;
export function getImageProps(
  node: JCRNodeWrapper | null | undefined,
  options: ImageOptions,
  context: ImageContext,
): ImgProps | null;
export function getImageProps(
  node: JCRNodeWrapper | null | undefined,
  options: ImageOptions,
  context: ImageContext,
): ImgProps | null {
  const {
    alt,
    layout = "constrained",
    slotWidth,
    widths,
    sizes,
    cacheDependency = true,
    fallback,
  } = options;

  if (!node) {
    return fallback ? { src: buildModuleFileUrl(fallback, {}, context), alt: alt.trim() } : null;
  }

  const meta = readImageMeta(node);
  const defaults = resolveImageDefaults(options, context);
  const breakpoints = options.breakpoints ?? defaults.breakpoints ?? DEFAULT_BREAKPOINTS;

  // One dependency for the whole set, rather than one per candidate URL
  const urlOptions: ImageUrlOptions = {
    ...options,
    meta,
    context,
    cacheDependency: false,
  };
  if (cacheDependency && context.renderContext) {
    server.render.addCacheDependency({ node }, context.renderContext);
  }

  const base = {
    alt: alt.trim(),
    // `fill` takes its box from its parent: intrinsic attributes would fight that CSS
    width: layout === "fill" ? undefined : meta.intrinsicWidth,
    height: layout === "fill" ? undefined : meta.intrinsicHeight,
  };

  /** What the caller asked for, once the layout has had its say. */
  const resolveSizes = (): string | undefined =>
    layoutNeedsSizes(layout) ? (sizes ?? derivedSizes(layout, slotWidth)) : sizes;

  const withLoading = (props: ImgProps): ImgProps =>
    isAutoSizes(props.sizes) ? { ...props, loading: "lazy" } : props;

  // A vector needs no candidates: one resolution-independent file serves every slot. Neither does
  // an image the caller opted out of resizing.
  if (meta.vector || defaults.unoptimized) {
    return withLoading({
      ...base,
      src: buildImageUrl(node, undefined, urlOptions).url,
      sizes: resolveSizes(),
    });
  }

  if (meta.intrinsicWidth === undefined) warnMissingIntrinsicSize(node);

  const requested = (widths ?? candidateWidths(layout, slotWidth, breakpoints))
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
  let ignoredResize = false;
  for (const candidate of requested) {
    const { url, channel } = buildImageUrl(node, { width: candidate }, urlOptions);
    if (channel === "query") ignoredResize = true;
    if (!widthByUrl.has(url)) widthByUrl.set(url, candidate);
  }

  if (ignoredResize) warnIgnoredResize(node);

  const [smallest] = [...widthByUrl.keys()];
  return withLoading({
    ...base,
    src: smallest ?? buildImageUrl(node, undefined, urlOptions).url,
    srcSet:
      widthByUrl.size > 1
        ? [...widthByUrl].map(([url, candidate]) => `${commaSafe(url)} ${candidate}w`).join(", ")
        : undefined,
    // Below two candidates there is no choice to describe, so only an explicit `sizes` survives
    sizes:
      widthByUrl.size > 1 ? (resolveSizes() ?? derivedSizes(layout, slotWidth)) : resolveSizes(),
  });
}

/**
 * Which channel each candidate of an image would use — the answer to "why does resizing do nothing
 * on my machine?". A plain instance reports `query` for anything but the pre-generated thumbnails,
 * meaning the URLs carry a size hint that only Media Optimization (on Jahia Cloud, in live mode)
 * interprets.
 *
 * Pass the same options the real call uses: a module-wide loader, or `unoptimized`, changes the
 * answer, and an inspection that ignored them would report a channel the images never take.
 *
 * @param node - The file node holding the image.
 * @param width - The width to inspect.
 * @param options - The loader, quality and context the real call would use.
 * @returns The channel that would carry that width.
 * @see {@link ImageResizeChannel}
 */
export function inspectImageChannel(
  node: JCRNodeWrapper,
  width: number,
  options?: ImageUrlOptions,
): ImageResizeChannel {
  return buildImageUrl(node, { width }, { ...options, cacheDependency: false }).channel;
}
