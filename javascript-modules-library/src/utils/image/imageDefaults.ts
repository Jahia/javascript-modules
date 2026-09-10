import type { RenderContext, Resource } from "org.jahia.services.render";
import type { AbsoluteUrlOption } from "../urlBuilder/absoluteUrl.js";

/**
 * The engine sets `bundleKey` as a context global while it evaluates a module's server bundle, and
 * `useServerContext()` reports the same value while a view of that module renders.
 *
 * @see {@link setImageDefaults} for why the image defaults are keyed by it.
 */
declare const bundleKey: string | undefined;

/** What a loader is given to build one candidate URL. Mirrors `next/image`'s `ImageLoaderProps`. */
export interface ImageLoaderProps {
  /** The asset's own URL, unresized — the same one the `original` channel returns. */
  src: string;
  /** The candidate width in image pixels, already clamped to the intrinsic width. */
  width: number;
  /** The requested quality, when the call site or the module defaults ask for one. */
  quality?: number;
}

/**
 * Builds the URL of one candidate, replacing the channel routing entirely.
 *
 * @example
 *   ```ts
 *   const cloudinary: ImageLoader = ({ src, width, quality }) =>
 *   `https://res.cloudinary.com/acme/image/fetch/f_auto,q_${quality ?? "auto"},w_${width}/${src}`;
 *   ```;
 */
export type ImageLoader = (props: ImageLoaderProps) => string;

/** The parts of an image request a module can decide once instead of at every call site. */
export interface ImageDefaults {
  /** Replaces the built-in channel routing. */
  loader?: ImageLoader;
  /** Passed to the loader, and to the `provider` and `query` channels as a `q` hint. */
  quality?: number;
  /** Serves the original bytes, with no candidates at all. */
  unoptimized?: boolean;
  /** The candidate ladder `constrained`, `full-width` and `fill` draw from. */
  breakpoints?: readonly number[];
}

/**
 * The Jahia render context an image function needs.
 *
 * `bundleKey` selects the module whose {@link setImageDefaults} apply; inside a render it comes from
 * `useServerContext()`, and outside one it is the caller's to pass.
 */
export interface ImageContext {
  renderContext?: RenderContext;
  currentResource?: Resource;
  bundleKey?: string;
}

/** What a single call may override, on top of its module's defaults. */
export interface ImageSourceOptions {
  /** Replaces the built-in channel routing. Defaults to the module's loader. */
  loader?: ImageLoader;
  /** Quality hint, passed to the loader and to the channels that carry hints. */
  quality?: number;
  /** Serve the original bytes: no resize, no candidates. */
  unoptimized?: boolean;
  /**
   * Return a URL with a scheme and a host — what `og:image` and JSON-LD need.
   *
   * @see {@link AbsoluteUrlOption}
   */
  absolute?: AbsoluteUrlOption;
}

/**
 * Every JavaScript module in an instance shares one GraalJS context, so a plain module-level
 * variable in this library would be engine-wide: one module's loader would rewrite another module's
 * images. Keying by bundle keeps a default inside the module that declared it.
 */
const defaultsByBundle = new Map<string, ImageDefaults>();

/**
 * Sets the image defaults of the calling module: every `JImage`, `getImageProps` and
 * `buildImageUrl` in it uses them unless the call overrides them.
 *
 * Call it at the top level of a server file — the engine only knows which module is speaking while
 * it evaluates that module's bundle.
 *
 * @example
 *   ```ts
 *   // src/server/images.ts, imported once from a view
 *   setImageDefaults({
 *   loader: ({ src, width, quality }) => `https://cdn.acme.com/${width}/${quality ?? 75}${src}`,
 *   quality: 80,
 *   });
 *   ```;
 *
 * @param defaults - Merged into whatever the module already set.
 * @throws When called outside a module's bundle evaluation, where there is no module to attach the
 *   defaults to.
 */
export function setImageDefaults(defaults: ImageDefaults): void {
  if (typeof bundleKey !== "string" || !bundleKey) {
    throw new Error(
      "setImageDefaults: no module to attach these defaults to. Call it at the top level of a " +
        "server file of your module, not inside a render or a callback.",
    );
  }

  defaultsByBundle.set(bundleKey, { ...defaultsByBundle.get(bundleKey), ...defaults });
}

/** The defaults a module registered, or an empty set for a module that registered none. */
export function getImageDefaults(context?: ImageContext): ImageDefaults {
  return (context?.bundleKey ? defaultsByBundle.get(context.bundleKey) : undefined) ?? {};
}

/** A call's own options over its module's defaults, each key resolved on its own. */
export function resolveImageDefaults(
  options: ImageSourceOptions | undefined,
  context: ImageContext | undefined,
): Required<Pick<ImageDefaults, "unoptimized">> & ImageDefaults {
  const defaults = getImageDefaults(context);
  return {
    loader: options?.loader ?? defaults.loader,
    quality: options?.quality ?? defaults.quality,
    unoptimized: options?.unoptimized ?? defaults.unoptimized ?? false,
    breakpoints: defaults.breakpoints,
  };
}

/** Drops every module's defaults. Exported for tests, which share one module registry. */
export function clearImageDefaults(): void {
  defaultsByBundle.clear();
}
