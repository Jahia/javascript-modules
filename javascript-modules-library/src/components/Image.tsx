import type { ImgHTMLAttributes, JSX } from "react";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { useServerContext } from "../hooks/useServerContext.js";
import { getImageProps, type ImageLayout } from "../utils/image/getImageProps.js";
import { buildModuleFileUrl } from "../utils/urlBuilder/urlBuilder.js";

/**
 * Renders a JCR image as an `<img>`: resized `src`, `srcSet` candidates, the matching `sizes`, the
 * intrinsic dimensions that reserve its space, and a render cache dependency on the image node.
 *
 * Declare how the image sits in the page — `layout` plus the slot `width` — rather than computing
 * candidate widths by hand. The element carries no styling of its own: pass a `className`.
 *
 * Server-side only, because it registers the cache dependency. A client component receives image
 * data instead: build it with {@link getImageProps} and pass it through `<Island props>`.
 *
 * @example
 *   ```tsx
 *   <Image node={cover} alt={title} width={400} className={classes.cover} />
 *   <Image node={hero} alt={title} layout="full-width" priority />
 *   ```;
 *
 * @returns The `<img>` element.
 */
export function Image({
  node,
  alt,
  layout,
  width,
  widths,
  sizes,
  priority = false,
  fallback,
  loading,
  fetchPriority,
  ...imgAttributes
}: Readonly<
  {
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
    width?: number;
    /** Explicit candidate widths in image pixels. Escape hatch: prefer `layout` + `width`. */
    widths?: number[];
    /**
     * Marks the image as the page's largest above-the-fold element: it loads eagerly, at high
     * priority, instead of being lazy-loaded.
     */
    priority?: boolean;
    /**
     * A module static asset (`import placeholder from "/static/img/placeholder.jpg"`) rendered when
     * `node` is missing, so an unfilled content property does not leave a broken image.
     */
    fallback?: string;
  } & Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet" | "width" | "height" | "alt">
>): JSX.Element | null {
  const context = useServerContext();

  const props = node
    ? getImageProps(node, { alt, layout, width, widths, sizes }, context)
    : fallback
      ? { src: buildModuleFileUrl(fallback, {}, context), alt: alt.trim() }
      : null;

  if (!props) return null;

  const { width: intrinsicWidth, height: intrinsicHeight } = props as {
    width?: number;
    height?: number;
  };

  return (
    <img
      {...props}
      {...imgAttributes}
      // Lazy loading without reserved space causes layout shift, so it is only safe once Jahia has
      // extracted the intrinsic dimensions.
      loading={
        loading ??
        (priority
          ? "eager"
          : intrinsicWidth !== undefined && intrinsicHeight !== undefined
            ? "lazy"
            : undefined)
      }
      fetchPriority={fetchPriority ?? (priority ? "high" : undefined)}
    />
  );
}
