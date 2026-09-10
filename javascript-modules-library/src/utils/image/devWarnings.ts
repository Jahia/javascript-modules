import type { JCRNodeWrapper } from "org.jahia.services.content";

/**
 * True on a development instance.
 *
 * Every part of this call can be missing — the whole `server` bridge outside the engine, the method
 * on an engine older than it — and a diagnostic that cannot tell must stay quiet rather than fail.
 */
const isDevelopmentMode = (): boolean => {
  try {
    return server.config.isDevelopmentMode();
  } catch {
    return false;
  }
};

/**
 * What has already been said. A diagnostic describes a mistake in the code, not an event, so the
 * second occurrence of the same key carries no information the first did not.
 */
const reported = new Set<string>();

/**
 * Prints one line per key, on a development instance only — a production instance pays nothing.
 *
 * @param key - What makes two occurrences the same mistake.
 * @param message - Built only when it will actually be printed.
 */
const warnOnce = (key: string, message: () => string): void => {
  if (!isDevelopmentMode() || reported.has(key)) return;

  reported.add(key);
  console.warn(message());
};

/** How a message names the image it is about. */
const identify = (node: JCRNodeWrapper): string => {
  try {
    return node.getPath() || "an image";
  } catch {
    return "an image";
  }
};

/** Where the messages send the reader for the long version. */
const GUIDE = "docs/2-guides/8-images/README.md";

/**
 * Warns, once, that the widths of an image travel as `?w=` parameters this instance most likely
 * ignores.
 *
 * Nothing else reports that trap: the markup is correct, only the bytes never shrink. What the
 * warning reports is a property of the instance, not of the image — if these parameters are ignored
 * for one asset they are ignored for every one — so one line per engine lifetime says everything a
 * second would.
 *
 * @param node - The file node whose candidates landed on the `query` channel.
 * @see {@link ImageResizeChannel} for what each channel does with a requested size.
 */
export function warnIgnoredResize(node: JCRNodeWrapper): void {
  warnOnce(
    "ignored-resize",
    () =>
      `getImageProps: the ?w= candidates of ${identify(node)} — and of every other image on this ` +
      `instance — return the original bytes, because only Media Optimization reads those ` +
      `parameters. Expected on an instance without it; the markup is still correct. ` +
      `See ${GUIDE}, "What actually resizes the image, and where".`,
  );
}

/**
 * Warns, once per asset, that Jahia never extracted the pixel size of a raster image.
 *
 * Everything the library derives from the intrinsic size is lost silently: candidates are no longer
 * capped by the original, no `width`/`height` pair reserves the space, and without a reserved space
 * the image cannot be lazy-loaded either. The markup that comes out is valid, which is exactly why
 * nobody notices.
 *
 * @param node - The raster file node carrying no `j:width`.
 */
export function warnMissingIntrinsicSize(node: JCRNodeWrapper): void {
  const path = identify(node);
  warnOnce(
    `missing-intrinsic-size:${path}`,
    () =>
      `getImageProps: ${path} carries no j:width, so Jahia never extracted its pixel size. ` +
      `Candidates are not capped by the original, no width/height pair reserves its space, and ` +
      `without that reservation the image is not lazy-loaded. Re-upload the file, or run the ` +
      `image extractor over it. See ${GUIDE}, "When Jahia never measured the image".`,
  );
}

/**
 * Warns, once per asset, that `sizes="auto"` and an eager load cannot both be honoured.
 *
 * These two legitimately arrive from different layers — a shared wrapper defaults every image to
 * `sizes="auto"`, a leaf view marks this one as the page's LCP element — and neither layer can see
 * the other. Refusing to render would turn a wrapper's default into a 500 on a production page, so
 * the eager load wins and the derived `sizes` replaces `auto`.
 *
 * @param node - The image whose `sizes` was replaced.
 * @param eagerness - Which prop asked for the eager load, quoted as the caller wrote it.
 * @param sizes - The value used instead.
 */
export function warnAutoSizesEager(
  node: JCRNodeWrapper,
  eagerness: string,
  sizes: string | undefined,
): void {
  const path = identify(node);
  warnOnce(
    `auto-sizes-eager:${path}`,
    () =>
      `JImage: ${path} asks for both sizes="auto" and ${eagerness}, and browsers only read "auto" ` +
      `on a lazily loaded image. The eager load wins, and ` +
      `${sizes ? `sizes="${sizes}"` : "no sizes"} is used instead. Describe the slot yourself to ` +
      `choose a better one, as in sizes="(min-width: 60rem) 33vw, 100vw". ` +
      `See ${GUIDE}, "Above the fold: preload".`,
  );
}
