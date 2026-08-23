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
import { ladderFromSizes } from "./sizesLadder.js";

/**
 * How the image occupies its slot. Declaring the intent lets the library derive both `srcSet` and
 * `sizes`, which is otherwise the part of responsive images that every call site gets wrong.
 *
 * The first question is not how wide the slot is, it is whether anything in the markup _knows_ how
 * wide it is — and, when nothing does, whether the image sits in the normal flow or is stretched
 * over a parent.
 *
 * - `constrained` (default): an image in the normal flow. It is described _either_ by a `slotWidth`,
 *   when the slot is at most that many CSS pixels and shrinks with the viewport below it, _or_ by a
 *   `sizes`, when CSS the markup cannot read decides its width — a `%`, a `fr`, a grid cell, an
 *   `aspect-ratio` box.
 * - `fixed`: the image is always `slotWidth` CSS pixels wide (an avatar, a logo slot, a card
 *   thumbnail in a fixed grid). It takes no `sizes`: the slot is one number.
 * - `full-width`: the image always spans the viewport (a hero, a full-bleed banner).
 * - `fill`: the image is positioned _over_ its closest positioned ancestor, which owns the box. It
 *   needs a `sizes`, and unlike every other layout it carries CSS of its own and drops the
 *   intrinsic dimensions, which would fight that parent.
 */
export type ImageLayout = "constrained" | "fixed" | "full-width" | "fill";

/**
 * How the slot is described: one way per layout, never two.
 *
 * A `slotWidth` and a `sizes` are two descriptions of the same box, and nothing can reconcile them
 * — so `constrained` takes exactly one of them, and the ladder of candidate files follows whichever
 * one was written. Passing both used to be accepted, and the `sizes` was emitted while the
 * candidates were still derived from the `slotWidth`: two claims about one slot, disagreeing
 * silently.
 *
 * TypeScript rejects the combinations below; {@link getImageProps} throws on them too, for the
 * untyped JavaScript caller and for the `{...props}` spread that defeats a union.
 */
export type ImageSlot =
  /** At most `slotWidth` CSS pixels, shrinking with the viewport below that. */
  | { layout?: "constrained"; slotWidth: number; sizes?: never }
  /**
   * Sized by CSS the markup cannot read, so the `sizes` string is the only description of the slot
   * — and the one the candidate ladder is derived from. `"auto"` lets the browser measure the real
   * box.
   */
  | { layout?: "constrained"; slotWidth?: never; sizes: string }
  /** Always `slotWidth` CSS pixels. No `sizes`: the slot is one number. */
  | { layout: "fixed"; slotWidth: number; sizes?: never }
  /** The viewport. `sizes` defaults to `100vw`; write one only to say `"auto"`. */
  | { layout: "full-width"; slotWidth?: never; sizes?: string }
  /** A box owned by a positioned parent, which only `sizes` can describe. */
  | { layout: "fill"; slotWidth?: never; sizes: string };

/**
 * Candidate file widths, in image pixels, offered for the layouts where the slot is not a single
 * number — `constrained` below its maximum, `full-width` and `fill` always. A `fixed` slot never
 * uses them: its width and that width doubled cover it.
 *
 * These are widths of _files_, not breakpoints of the layout: the slot is described by `sizes`, and
 * the browser matches one against the other at load time. Doubling-ish steps keep the ladder short,
 * because a candidate only pays for itself if it is meaningfully smaller than the next one up.
 *
 * The two ends also stand in for the viewport range a `sizes`-described slot is planned against;
 * see {@link ladderFromSizes}.
 */
export const DEFAULT_BREAKPOINTS: readonly number[] = [320, 640, 960, 1280, 1920, 2560];

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

/** What {@link getImageProps} takes, apart from the slot description in {@link ImageSlot}. */
export interface ImageOptionsBase extends ImageSourceOptions {
  /** Alternative text; `""` declares the image decorative. */
  alt: string;
  /** Explicit candidate widths in image pixels. Overrides the ladder the layout would derive. */
  widths?: number[];
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
 * What {@link getImageProps} takes: the alternative text, the slot description, and the overrides.
 *
 * `slotWidth` is named apart from the `width` HTML attribute on purpose: it is how much room the
 * layout gives the image, not a number that ends up in the markup.
 */
export type ImageOptions = ImageOptionsBase & ImageSlot;

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

/** A slot description the layout accepts, with the `sizes` it resolves to. */
interface ResolvedSlot {
  /** The `sizes` attribute this slot implies, derived when the caller wrote none. */
  sizes: string;
  /** The slot width in CSS pixels, when the caller described the slot with one. */
  slotWidth?: number;
}

/**
 * Checks that the slot is described exactly once, the way {@link ImageSlot} says, and resolves the
 * `sizes` that description implies.
 *
 * {@link ImageSlot} already rejects each of these at the call site. The throws are for the untyped
 * JavaScript caller and for the `{...props}` spread, which defeats a union — and they name the
 * exits rather than only the rule, because the caller reading them has just been told their view is
 * wrong and needs to know what to write instead.
 */
const resolveSlot = (
  layout: ImageLayout,
  slotWidth: number | undefined,
  sizes: string | undefined,
): ResolvedSlot => {
  const takesNoSlotWidth = () => {
    if (slotWidth !== undefined) {
      throw new Error(
        `getImageProps: layout "${layout}" takes no slotWidth, because the slot is not a number of ` +
          "CSS pixels the markup states. Describe it with sizes instead.",
      );
    }
  };

  switch (layout) {
    case "full-width":
      takesNoSlotWidth();
      return { sizes: sizes ?? "100vw" };

    case "fill":
      takesNoSlotWidth();
      if (sizes === undefined) throw new Error(needsSizes(layout));
      return { sizes };

    case "fixed":
      if (sizes !== undefined) {
        throw new Error(
          'getImageProps: layout "fixed" takes no sizes, because the layout means the slot is one ' +
            'number and slotWidth already states it. Use layout "constrained" with a sizes for a ' +
            "slot whose width changes.",
        );
      }
      if (slotWidth === undefined) {
        throw new Error(
          'getImageProps: layout "fixed" needs a slotWidth (the slot width in CSS pixels).',
        );
      }
      return { sizes: `${slotWidth}px`, slotWidth };

    case "constrained":
      if (slotWidth !== undefined && sizes !== undefined) {
        throw new Error(
          'getImageProps: layout "constrained" takes a slotWidth or a sizes, never both. They are ' +
            "two descriptions of one slot, and the candidate files can only follow one of them. " +
            "Keep slotWidth when the slot is at most that many CSS pixels; keep sizes when CSS the " +
            "markup cannot read decides its width.",
        );
      }
      if (sizes !== undefined) return { sizes };
      if (slotWidth === undefined) throw new Error(needsSizes(layout));
      return { sizes: `(min-width: ${slotWidth}px) ${slotWidth}px, 100vw`, slotWidth };
  }
};

/** Names both exits, because a caller who wrote neither has to be told there are two. */
const needsSizes = (layout: ImageLayout): string =>
  `getImageProps: layout "${layout}" needs the slot described, and nothing in the markup ` +
  "describes it. Either give a slotWidth, the slot width in CSS pixels, or give a sizes — " +
  'sizes="auto" lets the browser measure the real box, and sizes="(min-width: 60rem) 33vw, 100vw" ' +
  "describes it yourself.";

/** The candidate widths a slot asks for, before clamping. */
const candidateWidths = (
  layout: ImageLayout,
  slot: ResolvedSlot,
  breakpoints: readonly number[],
): number[] => {
  // No number in the markup: the `sizes` string is the only description of the slot, so the ladder
  // is derived from it rather than from a width that string never mentions
  if (slot.slotWidth === undefined) return ladderFromSizes(slot.sizes, breakpoints);

  const width = slot.slotWidth;
  // Two device-pixel ratios cover the realistic range; a 3x file is rarely worth its bytes
  const densities = [width, width * 2];
  if (layout === "fixed") return densities;

  // Constrained: the slot shrinks with the viewport, so every file up to the 2x one is useful — a
  // 1.33x screen at the full slot should get the band above the slot, not the top of the ladder
  return [...breakpoints.filter((candidate) => candidate <= 2 * width), ...densities];
};

/**
 * Builds `<img>` props from a Jahia image node: a resized `src`, a `srcSet` of candidates, the
 * matching `sizes`, and the intrinsic dimensions.
 *
 * Describe the slot once — a `slotWidth` when the markup states its width in CSS pixels, a `sizes`
 * when only CSS knows it — and both the candidates and the `sizes` attribute follow that one
 * description. On a fluid design most slots are the second kind, and `sizes="auto"` lets the
 * browser measure the real box.
 *
 * @example
 *   ```tsx
 *   const context = useServerContext();
 *   <img {...getImageProps(node, { alt: "Bay view", slotWidth: 400 }, context)} />
 *   <img {...getImageProps(node, { alt: "", sizes: "auto" }, context)} />
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

  // Before the node is even looked at, so that a view describing its slot wrongly fails the same
  // way whether or not the content property happens to be filled
  const slot = resolveSlot(layout, slotWidth, sizes);

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

  const withLoading = (props: ImgProps): ImgProps =>
    isAutoSizes(props.sizes) ? { ...props, loading: "lazy" } : props;

  // A vector needs no candidates: one resolution-independent file serves every slot. Neither does
  // an image the caller opted out of resizing.
  if (meta.vector || defaults.unoptimized) {
    return withLoading({
      ...base,
      src: buildImageUrl(node, undefined, urlOptions).url,
      sizes,
    });
  }

  if (meta.intrinsicWidth === undefined) warnMissingIntrinsicSize(node);

  const requested = (widths ?? candidateWidths(layout, slot, breakpoints))
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
    sizes: widthByUrl.size > 1 ? slot.sizes : sizes,
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
