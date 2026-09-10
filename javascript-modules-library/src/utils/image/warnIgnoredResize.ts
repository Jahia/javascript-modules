import type { JCRNodeWrapper } from "org.jahia.services.content";

/**
 * Whether the instance has already been told. What the warning reports is a property of the
 * instance, not of the image — if these parameters are ignored for one asset they are ignored for
 * every one — so one line per engine lifetime says everything a second would.
 */
let reported = false;

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

/** How the message names the image it uses as its example. */
const identify = (node: JCRNodeWrapper): string => {
  try {
    return node.getPath() || "an image";
  } catch {
    return "an image";
  }
};

/**
 * Warns, once, that the widths of an image travel as `?w=` parameters this instance most likely
 * ignores.
 *
 * Nothing else reports that trap: the markup is correct, only the bytes never shrink. The warning
 * is emitted in development mode only — a production instance pays nothing — and stays silent about
 * anything it cannot read, because a diagnostic that breaks a render is worse than no diagnostic.
 *
 * @param node - The file node whose candidates landed on the `query` channel.
 * @see {@link ImageResizeChannel} for what each channel does with a requested size.
 */
export function warnIgnoredResize(node: JCRNodeWrapper): void {
  if (!isDevelopmentMode()) return;

  if (reported) return;
  reported = true;

  console.warn(
    `getImageProps: the ?w= candidates of ${identify(node)} — and of every other image on this ` +
      `instance — return the original bytes, because only Media Optimization reads those ` +
      `parameters. Expected on an instance without it; the markup is still correct. ` +
      `See docs/2-guides/8-images/README.md, "What actually resizes the image, and where".`,
  );
}
