import type { CSSProperties, ImgHTMLAttributes, JSX } from "react";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { useServerContext } from "../hooks/useServerContext.js";
import { buildThumbnailUrl, cssUrl } from "../utils/image/buildImageUrl.js";
import { warnAutoSizesEager } from "../utils/image/devWarnings.js";
import {
  getImageProps,
  isAutoSizes,
  layoutNeedsSizes,
  type ImageLayout,
  type ImgProps,
} from "../utils/image/getImageProps.js";
import type { ImageSourceOptions } from "../utils/image/imageDefaults.js";

/**
 * Attributes spread onto the `<img>` last, after everything the component computed.
 *
 * A record covers the static ones — which a plain JSX attribute already expresses. The function
 * form is for a value that depends on the image the library resolved: an analytics attribute
 * carrying the final `src`, a test hook naming the width actually served.
 */
export type ExtraImageAttributes =
  | Record<string, string | number | boolean | undefined>
  | ((image: ImgProps) => Record<string, string | number | boolean | undefined>);

/**
 * The `width` and `height` HTML attributes, which together state one box — and therefore travel
 * together. Writing only one used to be legal and quietly dropped the other, which is also how a
 * call site written against `width` as the _slot_ width type-checked and then failed at render.
 */
export type MarkupBox =
  | { width: number | `${number}`; height: number | `${number}` }
  | { width?: undefined; height?: undefined };

/**
 * What `JImage` decides for itself.
 *
 * The HTML attributes it accepts are everything an `<img>` takes _minus these_ — derived, not
 * hand-listed, so adding a prop here can never silently swallow an attribute that used to reach the
 * element. Only `src` and `srcSet` are additionally withheld: the component computes them.
 */
export interface JImageProps extends ImageSourceOptions {
  /** The file node holding the image. When missing, `fallback` is rendered instead. */
  node?: JCRNodeWrapper | null;
  /** Alternative text; `""` declares the image decorative. */
  alt: string;
  /**
   * How the image occupies its slot.
   *
   * @default "constrained"
   */
  layout?: ImageLayout;
  /** The slot width in CSS pixels. Required by the `constrained` and `fixed` layouts. */
  slotWidth?: number;
  /** Explicit candidate widths in image pixels. Overrides the ladder the layout would derive. */
  widths?: number[];
  /**
   * Explicit `sizes` attribute. Required by the `fluid` and `fill` layouts. `"auto"` measures the
   * real box and forces `loading="lazy"`, the only mode in which browsers read it.
   */
  sizes?: string;
  /** Candidate ladder used by every layout but `fixed`. */
  breakpoints?: readonly number[];
  /**
   * Register a render cache dependency on the image node.
   *
   * @default true
   */
  cacheDependency?: boolean;
  /**
   * Marks the image as the page's largest above-the-fold element: it loads eagerly and at high
   * fetch priority instead of being lazy-loaded. Use it on one image per page.
   */
  preload?: boolean;
  /**
   * A module static asset (`import placeholder from "/static/img/placeholder.jpg"`) rendered when
   * `node` is missing, so an unfilled content property does not leave a broken image.
   */
  fallback?: string;
  /**
   * A low-quality image shown underneath while the real one downloads: `"blur"` uses the smallest
   * thumbnail Jahia pre-generated, and a `data:image/…` value is used as given.
   *
   * @default "empty"
   */
  placeholder?: "blur" | "empty" | `data:image/${string}`;
  /** The `placeholder="blur"` source, when the Jahia thumbnail is not the one you want. */
  blurDataURL?: string;
  /** Spread onto the `<img>` last. */
  attributes?: ExtraImageAttributes;
  /**
   * The `width` HTML attribute. Overrides the intrinsic width — with `height`, this is how an image
   * takes its box from the markup and needs no CSS rule at all.
   *
   * Required together with `height`: half of yours and half of ours would state a wrong aspect
   * ratio. The room the _layout_ gives the image is {@link JImageProps.slotWidth}, a different
   * number with a different job.
   */
  width?: number | `${number}`;
  /** The `height` HTML attribute. Overrides the intrinsic height; see {@link JImageProps.width}. */
  height?: number | `${number}`;
}

/** The layout that has to be CSS, because "fills its parent" is not something markup can say. */
const FILL_STYLE: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
};

/**
 * Renders a JCR image as an `<img>`: resized `src`, `srcSet` candidates, the matching `sizes`, the
 * intrinsic dimensions that reserve its space, and a render cache dependency on the image node.
 *
 * Declare how the image sits in the page — `layout`, plus `slotWidth` for the layouts measured in
 * CSS pixels — rather than computing candidate widths by hand. On a fluid design, where no slot has
 * a pixel width, that is `layout="fluid"` with `sizes="auto"`.
 *
 * The element carries no styling of its own, except where the feature _is_ styling: `layout="fill"`
 * positions it over its parent, and `placeholder` paints a background. Anything else is your
 * `className`, and any `style` you pass wins over both.
 *
 * Server-side only, because it registers the cache dependency. A client component receives image
 * data instead: build it with {@link getImageProps} and pass it through `<Island props>`.
 *
 * @example
 *   ```tsx
 *   <JImage node={card} alt="" layout="fluid" sizes="auto" className={classes.card} />
 *   <JImage node={cover} alt={title} slotWidth={400} className={classes.cover} />
 *   <JImage node={hero} alt={title} layout="full-width" preload />
 *   <JImage node={icon} alt="" width={48} height={48} />
 *   ```;
 *
 * @returns The `<img>` element.
 */
export function JImage({
  node,
  alt,
  layout,
  slotWidth,
  widths,
  sizes,
  breakpoints,
  cacheDependency,
  loader,
  quality,
  unoptimized,
  absolute,
  preload = false,
  fallback,
  placeholder = "empty",
  blurDataURL,
  attributes,
  width,
  height,
  loading,
  fetchPriority,
  style,
  ...imgAttributes
}: Readonly<
  JImageProps & Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet" | keyof JImageProps>
> &
  MarkupBox): JSX.Element | null {
  const context = useServerContext();

  // Caught here rather than at the `<img>`, because the call site that writes one of the two is
  // usually one that meant `slotWidth` — and TypeScript already rejects that spelling
  if ((width === undefined) !== (height === undefined)) {
    throw new Error(
      "JImage: width and height are the HTML attributes and state one box, so pass both or " +
        "neither. If you meant how much room the layout gives the image, that is slotWidth.",
    );
  }

  // `sizes="auto"` is only read on a lazily loaded image. Loading it eagerly does not degrade to
  // "the browser measures the box anyway": it degrades to 100vw, which downloads the largest
  // candidate on every screen. The two props legitimately come from different layers — a shared
  // wrapper defaults every image to `auto`, a leaf view marks this one as the LCP element — so the
  // eager load wins over the default and the layout's own `sizes` replaces `auto`.
  const eagerness = preload ? "preload" : loading === "eager" ? 'loading="eager"' : undefined;
  const autoOverridden = eagerness !== undefined && isAutoSizes(sizes);
  const requestedSizes = !autoOverridden
    ? sizes
    : // A layout that derives no `sizes` of its own has only the safe, wasteful answer left
      layoutNeedsSizes(layout)
      ? "100vw"
      : undefined;

  const image: ImgProps | null = getImageProps(
    node,
    {
      alt,
      layout,
      slotWidth,
      widths,
      sizes: requestedSizes,
      breakpoints,
      cacheDependency,
      loader,
      quality,
      unoptimized,
      absolute,
      fallback,
    },
    context,
  );

  if (!image) return null;

  if (autoOverridden && node) warnAutoSizesEager(node, eagerness, image.sizes);

  // The caller owns the box or the library does; a mix of the two states a wrong aspect ratio
  const markupSized = width !== undefined;
  const renderedWidth = markupSized ? width : image.width;
  const renderedHeight = markupSized ? height : image.height;

  const autoSizes = isAutoSizes(image.sizes);

  // Lazy loading without reserved space causes layout shift, so it is only safe once the space is
  // known — from the intrinsic dimensions, from the ones the caller wrote, or from the positioned
  // parent a `fill` image is stretched over.
  const spaceReserved =
    layout === "fill" || (renderedWidth !== undefined && renderedHeight !== undefined);

  const placeholderUrl =
    placeholder === "empty"
      ? undefined
      : placeholder === "blur"
        ? (blurDataURL ?? (node ? buildThumbnailUrl(node, { absolute, context }) : undefined))
        : placeholder;

  return (
    <img
      {...image}
      {...imgAttributes}
      width={renderedWidth}
      height={renderedHeight}
      loading={loading ?? (preload ? "eager" : autoSizes || spaceReserved ? "lazy" : undefined)}
      fetchPriority={fetchPriority ?? (preload ? "high" : undefined)}
      style={
        layout === "fill" || placeholderUrl
          ? {
              ...(layout === "fill" && FILL_STYLE),
              ...(placeholderUrl && {
                backgroundImage: cssUrl(placeholderUrl),
                backgroundSize: "cover",
                backgroundPosition: "50% 50%",
                backgroundRepeat: "no-repeat",
              }),
              ...style,
            }
          : style
      }
      {...(typeof attributes === "function" ? attributes(image) : attributes)}
    />
  );
}
