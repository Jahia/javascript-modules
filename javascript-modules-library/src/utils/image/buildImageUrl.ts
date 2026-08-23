import type { JCRNodeWrapper } from "org.jahia.services.content";
import { toAbsoluteUrl } from "../urlBuilder/absoluteUrl.js";
import { buildNodeUrl } from "../urlBuilder/urlBuilder.js";
import {
  resolveImageDefaults,
  type ImageContext,
  type ImageSourceOptions,
} from "./imageDefaults.js";
import { clampToIntrinsic, readImageMeta, type ImageMeta } from "./imageMeta.js";

/**
 * How a requested size reached the image — reported so that "this environment cannot resize" is a
 * named outcome rather than a URL that silently returns the original bytes.
 *
 * - `original`: no resize was requested, or the request was a no-op (it matched the intrinsic size),
 *   or `unoptimized` opted the image out, so the untouched asset URL is returned.
 * - `loader`: a {@link ImageLoader} owns the URL. Whether it resizes is that loader's business, and
 *   the library stops guessing.
 * - `provider`: the size was handed to the node's own provider through `node.getUrl(["w:600"])`. An
 *   external provider mount (a DAM: Keepeek, Cloudinary…) decorates that call into a signed,
 *   transformed URL; whether a given provider honours every dimension is up to its decorator.
 * - `thumbnail`: a pre-generated Jahia thumbnail matched the request. Real resizing, and the only
 *   channel that works on a plain instance with no CDN in front of it.
 * - `query`: the size travels as `?w=` / `?h=` query parameters. Honoured by the Media Optimization
 *   (Cloudimage) proxy in live mode on Jahia Cloud, and ignored — same bytes — by the plain file
 *   servlet, because
 *   {@link https://academy.jahia.com/documentation/jahia-cms/jahia-8-2/developer/optional-features/media-optimization-cloudimage Media Optimization}
 *   is what interprets them.
 */
export type ImageResizeChannel = "original" | "loader" | "provider" | "thumbnail" | "query";

/** A URL, plus how the requested size actually reached the image. */
export interface ImageUrl {
  url: string;
  channel: ImageResizeChannel;
  /** The width the URL actually asks for, clamped to the intrinsic width. */
  width?: number;
}

/** What every URL-building call accepts, on top of the resize options it defines itself. */
export interface ImageUrlOptions extends ImageSourceOptions {
  /** Pre-read metadata, so a caller building several candidates reads `j:width` once. */
  meta?: ImageMeta;
  /** Provided by React context on the server; pass one when calling outside a render. */
  context?: ImageContext;
  /**
   * Register a render cache dependency on the image node, so that replacing the image in jContent
   * flushes the fragments that display it. Turn it off only when the caller registers it itself.
   *
   * @default true
   */
  cacheDependency?: boolean;
}

/**
 * Widths of Jahia's pre-generated thumbnails, in image pixels.
 *
 * Every Jahia instance generates these for uploaded images without any additional module, so they
 * are the one resize channel available offline. Keep them in ascending order.
 */
const THUMBNAILS: readonly { name: string; width: number }[] = [
  { name: "thumbnail", width: 150 },
  { name: "thumbnail2", width: 350 },
];

/**
 * True when the node lives in the default JCR provider (a local `/files` asset), false when it is
 * mounted from an external provider.
 */
const isDefaultProvider = (node: JCRNodeWrapper): boolean => {
  try {
    return node.getProvider().isDefault();
  } catch {
    // A provider that cannot be read is treated as external: the provider channel builds a URL
    // through the decorator, which is a no-op for the default provider, whereas the opposite
    // mistake would send a DAM node down a query-string path its CDN never sees.
    return false;
  }
};

/** A thumbnail Jahia generated for this node, by name. */
const thumbnailUrl = (node: JCRNodeWrapper, name: string): string | undefined => {
  try {
    return node.getThumbnailUrl(name) || undefined;
  } catch {
    return undefined;
  }
};

/** The thumbnail whose width matches the request exactly, if Jahia generated one. */
const matchingThumbnail = (node: JCRNodeWrapper, width: number): string | undefined => {
  const thumbnail = THUMBNAILS.find((candidate) => candidate.width === width);
  return thumbnail && thumbnailUrl(node, thumbnail.name);
};

/**
 * Registers the render cache dependency on the image node.
 *
 * Silent without a render context: a call outside a render has nothing to invalidate, and refusing
 * would make `buildImageUrl` unusable from a script or a test.
 */
const registerCacheDependency = (node: JCRNodeWrapper, context: ImageContext | undefined): void => {
  const renderContext = context?.renderContext;
  if (renderContext) server.render.addCacheDependency({ node }, renderContext);
};

/**
 * Builds the URL of a JCR image, resized to the requested dimensions.
 *
 * The requested size is clamped to the image's intrinsic size, and a resize that would be a no-op
 * returns the original URL. Which channel carries the size depends on where the asset lives — see
 * {@link ImageResizeChannel}; the chosen one is reported so callers (and the images guide) can be
 * explicit about what a given environment will actually do. A module that speaks its own URL
 * dialect replaces the routing with a {@link ImageLoader}.
 *
 * Registers a render cache dependency on the node, like `getImageProps` does — a CSS background
 * image built here is flushed when an editor replaces the picture.
 *
 * @param node - The file node holding the image.
 * @param size - The requested size in image pixels. Omit to get the original.
 * @param options - Loader, quality, absolute URLs, pre-read metadata and the render context.
 * @returns The URL and the channel that carried the size.
 * @see {@link getImageProps} to build a full set of `<img>` props, including `srcSet`.
 * @see {@link buildBackgroundImageUrl} for a ready-to-use CSS `url(…)` value.
 */
export function buildImageUrl(
  node: JCRNodeWrapper,
  size?: { width?: number; height?: number },
  options?: ImageUrlOptions,
): ImageUrl {
  const meta = options?.meta ?? readImageMeta(node);
  const context = options?.context;
  const absolute = options?.absolute;
  const { loader, quality, unoptimized } = resolveImageDefaults(options, context);

  if (options?.cacheDependency ?? true) registerCacheDependency(node, context);

  const original = (): ImageUrl => ({
    url: toAbsoluteUrl(buildNodeUrl(node, {}, context), node, absolute, context),
    channel: "original",
  });

  // A vector is resolution-independent: resizing it server-side is meaningless
  if (meta.vector) return original();
  // The caller wants these bytes, whatever a channel or a CDN would have made of them
  if (unoptimized) return original();

  const width =
    size?.width === undefined ? undefined : clampToIntrinsic(size.width, meta.intrinsicWidth);
  const height =
    size?.height === undefined ? undefined : clampToIntrinsic(size.height, meta.intrinsicHeight);

  // A loader owns the URL, including the decision to serve the same bytes at every width — so it
  // is called even when the requested width matches the original, which is where a CDN still does
  // its format negotiation. It only speaks widths, so a height-only request is not for it.
  if (loader && width !== undefined) {
    return {
      url: toAbsoluteUrl(
        loader({ src: buildNodeUrl(node, {}, context), width, quality }),
        node,
        absolute,
        context,
      ),
      channel: "loader",
      width,
    };
  }

  const noopWidth = width === undefined || width === meta.intrinsicWidth;
  const noopHeight = height === undefined || height === meta.intrinsicHeight;
  if (noopWidth && noopHeight) return original();

  // An external provider's decorator signs and transforms; `args` reach node.getUrl(List)
  if (!isDefaultProvider(node)) {
    return {
      url: buildNodeUrl(
        node,
        {
          absolute,
          args: {
            ...(noopWidth ? {} : { w: width! }),
            ...(noopHeight ? {} : { h: height! }),
            ...(quality === undefined ? {} : { q: quality }),
          },
        },
        context,
      ),
      channel: "provider",
      width,
    };
  }

  // A pre-generated thumbnail is a real, offline resize — prefer it over a hint nothing may honour.
  // It is a fixed rendition, so a quality hint has nothing to act on and is dropped.
  if (noopHeight && width !== undefined) {
    const thumbnail = matchingThumbnail(node, width);
    if (thumbnail) {
      return {
        url: toAbsoluteUrl(thumbnail, node, absolute, context),
        channel: "thumbnail",
        width,
      };
    }
  }

  return {
    url: buildNodeUrl(
      node,
      {
        absolute,
        parameters: {
          ...(noopWidth ? {} : { w: String(width) }),
          ...(noopHeight ? {} : { h: String(height) }),
          ...(quality === undefined ? {} : { q: String(quality) }),
        },
      },
      context,
    ),
    channel: "query",
    width,
  };
}

/**
 * Commas are legal inside a URL but they separate items in both of the places an image URL travels
 * to — the `srcSet` candidate list and the `background-image` layer list — and Jahia's srcset
 * rewriter splits on every one of them, corrupting for instance a Cloudinary transformation URL
 * (`…/upload/f_auto,w_600/…`). Percent-encoding them keeps every reader happy.
 *
 * @see {@link https://github.com/Jahia/jahia/issues/23}
 */
export const commaSafe = (url: string): string => url.replaceAll(",", "%2C");

/**
 * Builds a CSS `url("…")` value for a JCR image, ready to drop into `background-image`.
 *
 * The same routing, clamping and cache dependency as {@link buildImageUrl}, plus the escaping a
 * stylesheet needs: the URL is quoted, and its commas, quotes and backslashes are percent-encoded.
 *
 * A background image has no `srcSet`, so ask for the largest size the slot can reach and let the
 * clamp cut it down; `image-set()` is the CSS answer to density, and it is the caller's to write.
 *
 * @example
 *   ```tsx
 *   <div style={{ backgroundImage: buildBackgroundImageUrl(node, { width: 1920 }) }} />
 *   ```;
 *
 * @param node - The file node holding the image.
 * @param size - The requested size in image pixels. Omit to get the original.
 * @param options - The same options {@link buildImageUrl} takes.
 * @returns A CSS value such as `url("/files/photo.jpg?w=1920")`.
 */
export function buildBackgroundImageUrl(
  node: JCRNodeWrapper,
  size?: { width?: number; height?: number },
  options?: ImageUrlOptions,
): string {
  return cssUrl(buildImageUrl(node, size, options).url);
}

/** Wraps a URL in a CSS `url()` value, neutralising everything a stylesheet parser reads. */
export const cssUrl = (url: string): string => {
  // A `data:` URI travels no rewriter, and the comma in `data:image/png;base64,…` separates the
  // header from the payload — encoding that one would destroy the image rather than protect it.
  const escaped = url.startsWith("data:") ? url : commaSafe(url);
  return `url("${escaped.replaceAll("\\", "%5C").replaceAll('"', "%22")}")`;
};

/**
 * The URL of the smallest thumbnail Jahia pre-generated for this node.
 *
 * The one image variant a plain instance produces offline, which makes it the low-quality
 * placeholder source that costs no new infrastructure.
 *
 * @param node - The file node holding the image.
 * @param options - Absolute URLs and the render context.
 * @returns The thumbnail URL, or `undefined` when Jahia generated none (a vector, a fresh upload,
 *   an external provider that exposes no thumbnails).
 */
export function buildThumbnailUrl(
  node: JCRNodeWrapper,
  options?: Pick<ImageUrlOptions, "absolute" | "context">,
): string | undefined {
  for (const { name } of THUMBNAILS) {
    const url = thumbnailUrl(node, name);
    if (url) return toAbsoluteUrl(url, node, options?.absolute, options?.context);
  }
  return undefined;
}

/** The widths Jahia can resize to offline, exposed for docs and tests. */
export const THUMBNAIL_WIDTHS: readonly number[] = THUMBNAILS.map(({ width }) => width);
