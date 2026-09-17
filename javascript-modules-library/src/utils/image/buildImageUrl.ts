import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { RenderContext, Resource } from "org.jahia.services.render";
import { buildNodeUrl } from "../urlBuilder/urlBuilder.js";
import { clampToIntrinsic, readImageMeta, type ImageMeta } from "./imageMeta.js";

/**
 * How a requested size reached the image — reported so that "this environment cannot resize" is a
 * named outcome rather than a URL that silently returns the original bytes.
 *
 * - `original`: no resize was requested, or the request was a no-op (it matched the intrinsic size),
 *   so the untouched asset URL is returned.
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
export type ImageResizeChannel = "original" | "provider" | "thumbnail" | "query";

/** A URL, plus how the requested size actually reached the image. */
export interface ImageUrl {
  url: string;
  channel: ImageResizeChannel;
  /** The width the URL actually asks for, clamped to the intrinsic width. */
  width?: number;
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

/** The thumbnail whose width matches the request exactly, if Jahia generated one. */
const matchingThumbnail = (node: JCRNodeWrapper, width: number): string | undefined => {
  const thumbnail = THUMBNAILS.find((candidate) => candidate.width === width);
  if (!thumbnail) return undefined;

  try {
    return node.getThumbnailUrl(thumbnail.name) || undefined;
  } catch {
    return undefined;
  }
};

/**
 * Builds the URL of a JCR image, resized to the requested dimensions.
 *
 * The requested size is clamped to the image's intrinsic size, and a resize that would be a no-op
 * returns the original URL. Which channel carries the size depends on where the asset lives — see
 * {@link ImageResizeChannel}; the chosen one is reported so callers (and the images guide) can be
 * explicit about what a given environment will actually do.
 *
 * @param node - The file node holding the image.
 * @param size - The requested size in image pixels. Omit to get the original.
 * @param options - Pre-read metadata (avoids re-reading `j:width` per candidate) and the render
 *   context, both optional.
 * @returns The URL and the channel that carried the size.
 * @see {@link getImageProps} to build a full set of `<img>` props, including `srcSet`.
 */
export function buildImageUrl(
  node: JCRNodeWrapper,
  size?: { width?: number; height?: number },
  options?: {
    meta?: ImageMeta;
    context?: { renderContext?: RenderContext; currentResource?: Resource };
  },
): ImageUrl {
  const meta = options?.meta ?? readImageMeta(node);
  const context = options?.context;
  const original = (): ImageUrl => ({
    url: buildNodeUrl(node, {}, context),
    channel: "original",
  });

  // A vector is resolution-independent: resizing it server-side is meaningless
  if (meta.vector) return original();

  const width =
    size?.width === undefined ? undefined : clampToIntrinsic(size.width, meta.intrinsicWidth);
  const height =
    size?.height === undefined ? undefined : clampToIntrinsic(size.height, meta.intrinsicHeight);

  const noopWidth = width === undefined || width === meta.intrinsicWidth;
  const noopHeight = height === undefined || height === meta.intrinsicHeight;
  if (noopWidth && noopHeight) return original();

  // An external provider's decorator signs and transforms; `args` reach node.getUrl(List)
  if (!isDefaultProvider(node)) {
    return {
      url: buildNodeUrl(
        node,
        {
          args: {
            ...(noopWidth ? {} : { w: width! }),
            ...(noopHeight ? {} : { h: height! }),
          },
        },
        context,
      ),
      channel: "provider",
      width,
    };
  }

  // A pre-generated thumbnail is a real, offline resize — prefer it over a hint nothing may honour
  if (noopHeight && width !== undefined) {
    const thumbnail = matchingThumbnail(node, width);
    if (thumbnail) return { url: thumbnail, channel: "thumbnail", width };
  }

  return {
    url: buildNodeUrl(
      node,
      {
        parameters: {
          ...(noopWidth ? {} : { w: String(width) }),
          ...(noopHeight ? {} : { h: String(height) }),
        },
      },
      context,
    ),
    channel: "query",
    width,
  };
}

/** The widths Jahia can resize to offline, exposed for docs and tests. */
export const THUMBNAIL_WIDTHS: readonly number[] = THUMBNAILS.map(({ width }) => width);
