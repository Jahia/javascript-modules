import type { JCRNodeWrapper } from "org.jahia.services.content";

/** What we can learn about an image asset before building any URL. */
export interface ImageMeta {
  /**
   * Vector images (SVG and friends) are never resized: they have no meaningful intrinsic pixel
   * size, and a `srcSet` of one URL says nothing.
   */
  vector: boolean;
  /** `j:width` in image pixels, when Jahia extracted it. */
  intrinsicWidth?: number;
  /** `j:height` in image pixels, when Jahia extracted it. */
  intrinsicHeight?: number;
}

/**
 * A JCR node throws on a property it does not carry, and `j:width` / `j:height` are only present
 * once Jahia's image extractor has run.
 */
const readPositiveLong = (node: JCRNodeWrapper, property: string): number | undefined => {
  try {
    const value = Number(node.getProperty(property)?.getLong());
    return value > 0 ? value : undefined;
  } catch {
    return undefined;
  }
};

/** Reads the mime type of a file node, tolerating a missing `jcr:content` child. */
const readMimeType = (node: JCRNodeWrapper): string => {
  try {
    return node.getNode("jcr:content")?.getPropertyAsString("jcr:mimeType") ?? "";
  } catch {
    return "";
  }
};

/**
 * Reads the mime type and, for a raster image, the intrinsic dimensions of a file node.
 *
 * @param node - A file node holding an image.
 * @returns The metadata needed to size the image, with unknown values left undefined.
 */
export function readImageMeta(node: JCRNodeWrapper): ImageMeta {
  const mimeType = readMimeType(node);

  // image/vnd.* covers vendor vector formats (Adobe Illustrator, DXF…)
  if (mimeType.startsWith("image/svg") || mimeType.startsWith("image/vnd")) {
    return { vector: true };
  }

  return {
    vector: false,
    intrinsicWidth: readPositiveLong(node, "j:width"),
    intrinsicHeight: readPositiveLong(node, "j:height"),
  };
}

/** Never requests more than the intrinsic size, when it is known. */
export const clampToIntrinsic = (requested: number, intrinsic?: number): number =>
  intrinsic ? Math.min(requested, intrinsic) : requested;
