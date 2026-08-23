import type { Locale } from "java.util";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { RenderContext } from "org.jahia.services.render";
import { appendParameters, buildNodeUrl, schemeRegExp } from "../urlBuilder/urlBuilder.js";
import { warnUnknownAllowedSchemes } from "./devWarnings.js";
import { DEFAULT_ALLOWED_SCHEMES, getLinkDefaults } from "./linkDefaults.js";
import type { AnchorProps, LinkContext, LinkOptions, LinkProps, LinkTarget } from "./types.js";

/** The values `jmix:link`'s `j:target` allows. Anything else omits the attribute. */
const TARGET_ATTRIBUTES: readonly string[] = ["_blank", "_parent", "_self", "_top"];

/**
 * The schemes this call allows: the call's own list, then the module's, then the built-in one.
 *
 * Whichever is chosen is intersected with the built-in list, so the option can only ever narrow.
 * Allowing a scheme the library rejects is not a call-site decision — `javascript:` and `data:` are
 * the reason the list exists — and a project that wants one has to be told so rather than to
 * discover its links quietly missing.
 */
function resolveAllowedSchemes(
  requested: readonly string[] | undefined,
  context: LinkContext | undefined,
): readonly string[] {
  const asked = requested ?? getLinkDefaults(context?.bundleKey).allowedSchemes;
  if (!asked) return DEFAULT_ALLOWED_SCHEMES;

  const normalized = asked.map((scheme) => scheme.trim().toLowerCase());
  const allowed = normalized.filter((scheme) => DEFAULT_ALLOWED_SCHEMES.includes(scheme));
  warnUnknownAllowedSchemes(normalized.filter((scheme) => !allowed.includes(scheme)));
  return allowed;
}

/**
 * Reproduces what a URL parser removes before it reads the scheme: ASCII tab and newline anywhere
 * in the URL, then leading and trailing C0 controls and spaces.
 *
 * The string the allow-list judges has to be the string the browser will act on. A tab inserted in
 * the middle of a scheme, or a control character in front of it, otherwise reads as an unrecognised
 * scheme here and as `javascript:` there.
 */
function normalizeUrl(raw: string): string {
  const stripped = raw.replaceAll("\t", "").replaceAll("\r", "").replaceAll("\n", "");
  let start = 0;
  let end = stripped.length;
  while (start < end && stripped.charCodeAt(start) <= 0x20) start++;
  while (end > start && stripped.charCodeAt(end - 1) <= 0x20) end--;
  return stripped.slice(start, end);
}

/** The URL to navigate to, or `undefined` when its scheme is not allow-listed. */
function allowedHref(raw: string, allowedSchemes: readonly string[]): string | undefined {
  const url = normalizeUrl(raw);
  if (!url) return undefined;

  // A same-document URL names neither a scheme nor a host
  if (url.startsWith("#")) return url;

  // A site-relative URL names no scheme either — but only as long as it names no host. A relative
  // URL whose second character is `/` or `\` is parsed as `//host`, which leaves the site under
  // whatever scheme the page itself was served with, and so has to go through the allow-list.
  if (url.startsWith("/")) return url[1] === "/" || url[1] === "\\" ? undefined : url;

  const scheme = schemeRegExp.exec(url)?.[1].toLowerCase();
  return scheme && allowedSchemes.includes(scheme) ? url : undefined;
}

/**
 * Applies the requested fragment, then the query string.
 *
 * A `hash` replaces the fragment the target already carries, and the empty string removes it.
 * Keeping the query ahead of whichever fragment survives is `appendParameters`' job.
 */
function composeUrl(base: string, parameters?: Record<string, string>, hash?: string): string {
  const fragmentIndex = base.indexOf("#");
  const path = fragmentIndex === -1 ? base : base.slice(0, fragmentIndex);

  const url =
    hash === undefined
      ? base
      : `${path}${hash ? `#${hash.startsWith("#") ? hash.slice(1) : hash}` : ""}`;

  return parameters ? appendParameters(url, parameters) : url;
}

/** A JCR read that must never break a render: the node may be gone by the time it is called. */
const read = <T>(node: JCRNodeWrapper, accessor: (node: JCRNodeWrapper) => T): T | undefined => {
  try {
    return accessor(node) ?? undefined;
  } catch {
    return undefined;
  }
};

/**
 * Two `JCRNodeWrapper` proxies for the same node are not guaranteed to be the same object, so
 * identity comparison is a bug even where it happens to work today.
 */
const isSameNode = (a: JCRNodeWrapper | undefined, b: JCRNodeWrapper | undefined): boolean => {
  if (!a || !b) return false;
  const identifier = read(a, (node) => node.getIdentifier());
  return identifier !== undefined && identifier === read(b, (node) => node.getIdentifier());
};

/**
 * Java writes a locale `fr_CH` and BCP 47 writes it `fr-CH`; both spellings name one language here,
 * because refusing the one the caller happens to have typed silently removes a working link.
 */
const normalizeLanguage = (language: string): string => language.replaceAll("-", "_");

/** A bare language accepts any region of it, so `"fr"` matches a site running `fr_CH`. */
const localeMatches = (locale: Locale, language: string): boolean => {
  const tag = normalizeLanguage(locale.toString());
  const requested = normalizeLanguage(language);
  return tag === requested || (!requested.includes("_") && tag.split("_")[0] === requested);
};

/**
 * Whether the node is translated at all. Content that is not — a file, a folder — is
 * language-neutral: it has no translation to point at and none to be missing.
 *
 * A node that cannot answer is treated as translated, which is the conservative reading: it leaves
 * the language the caller asked for in place rather than quietly ignoring it.
 */
function hasTranslations(node: JCRNodeWrapper): boolean {
  try {
    return node.hasTranslations();
  } catch {
    return true;
  }
}

/**
 * Whether the target exists in the requested language.
 *
 * Language-neutral content stays navigable. A check that cannot run leaves the link alone: a false
 * negative here removes a link that works.
 */
function hasTranslation(node: JCRNodeWrapper, language: string): boolean {
  try {
    const invalidLanguages = node.hasProperty("j:invalidLanguages")
      ? node
          .getProperty("j:invalidLanguages")
          .getValues()
          .map((value) => value.getString())
      : [];
    if (invalidLanguages.includes(normalizeLanguage(language))) return false;

    if (!hasTranslations(node)) return true;
    return node.getExistingLocales().some((locale) => localeMatches(locale, language));
  } catch {
    return true;
  }
}

/**
 * The URL of a node target, or `undefined` when there is none.
 *
 * `buildNodeUrl` throws on a falsy node and on a mode it cannot infer, and `getUrl()` returns null
 * on a repository error. An unusable URL is the ordinary not-navigable outcome of this API, not an
 * error to propagate: a thrown error replaces the whole fragment with an HTML comment.
 *
 * The language is dropped for language-neutral content. Passing one takes `buildNodeUrl` down its
 * manual branch, which concatenates `/cms/render/<workspace>/<language><path>.html` and so loses
 * the `/files/<workspace>/<path>` form `getUrl()` gives an `nt:file` — a URL that does not serve
 * the file. Content with no translations has no language to be pointed at anyway.
 */
function buildTargetUrl(
  node: JCRNodeWrapper,
  language: string | undefined,
  context: LinkContext | undefined,
): string | undefined {
  try {
    const config = language && hasTranslations(node) ? { language } : {};
    return buildNodeUrl(node, config, context) || undefined;
  } catch {
    return undefined;
  }
}

function registerCacheDependency(
  cacheDependency: LinkOptions["cacheDependency"],
  node: JCRNodeWrapper | undefined,
  renderContext: RenderContext | undefined,
): void {
  if (cacheDependency === false || !renderContext) return;

  const key =
    typeof cacheDependency === "object" && cacheDependency !== null
      ? cacheDependency
      : node
        ? { node }
        : undefined;
  if (!key) return;

  server.render.addCacheDependency(key, renderContext);
}

/**
 * Builds the props of a link from whatever names its target: a node, a URL, or nothing.
 *
 * Not being navigable is a result, not an error. A reference that does not resolve is the normal
 * state of a link to an unpublished page — publishing a page does not publish the pages it links to
 * — so this function never throws and never returns an `href` it could not build. The caller
 * renders the children without an anchor; `state.navigable` says which case it is in.
 *
 * On the way it registers the render cache dependency, validates the anchor `target`, adds `rel` to
 * `_blank`, derives the label, and answers whether the target is the page being rendered.
 *
 * @example
 *   ```tsx
 *   const { anchor, state } = getLinkProps(props["j:linknode"], {}, useServerContext());
 *   return state.navigable ? <a {...anchor}>{state.label}</a> : <>{state.label}</>;
 *   ```;
 *
 * @param target - The node to link to, an already-built URL, or nothing.
 * @param options - Query string, fragment, language, anchor attributes and cache dependency.
 * @param context - What the link is resolved against. Pass `useServerContext()`: this function
 *   reads no React context of its own, so omitting it inside a render does not fall back to one. It
 *   degrades instead — without `renderContext` no cache dependency is registered, and without
 *   `mainNode` `isCurrent` and `isAncestor` are always false. Omit it only outside a render, where
 *   there is nothing to read. Its `bundleKey` selects the module whose `setLinkDefaults` apply.
 * @returns The anchor attributes and the state of the link. Never throws.
 * @see {@link resolveContentLink} to read the target off a content node first.
 */
export function getLinkProps(
  target: LinkTarget,
  options: LinkOptions = {},
  context?: LinkContext,
): LinkProps {
  const node = typeof target === "string" ? undefined : (target ?? undefined);

  let href: string | undefined;
  if (!target) {
    href = undefined;
  } else if (typeof target === "string") {
    href = allowedHref(target, resolveAllowedSchemes(options.allowedSchemes, context));
  } else if (
    !options.language ||
    options.requireTranslation === false ||
    hasTranslation(target, options.language)
  ) {
    href = buildTargetUrl(target, options.language, context);
  }

  if (href !== undefined) href = composeUrl(href, options.parameters, options.hash);

  // Registered even when the link is not navigable, which is the case the { uuid } form addresses
  // — see LinkOptions.cacheDependency for the engine limitation that form currently hits
  registerCacheDependency(options.cacheDependency, node, context?.renderContext);

  const mainNode = context?.mainNode;
  const path = node && read(node, (linked) => linked.getPath());
  const mainPath = mainNode && read(mainNode, (main) => main.getPath());

  const state = {
    node,
    navigable: href !== undefined,
    isCurrent: options.isCurrent ?? isSameNode(node, mainNode),
    isAncestor:
      path !== undefined &&
      mainPath !== undefined &&
      (mainPath === path || mainPath.startsWith(`${path}/`)),
    label:
      options.label ?? (node ? (read(node, (linked) => linked.getDisplayableName()) ?? "") : ""),
  };

  if (href === undefined) return { anchor: {}, state };

  const targetAttribute =
    options.target && TARGET_ATTRIBUTES.includes(options.target) ? options.target : undefined;
  const rel = options.rel ?? (targetAttribute === "_blank" ? "noopener noreferrer" : undefined);

  const anchor: AnchorProps = { href };
  if (targetAttribute) anchor.target = targetAttribute;
  if (rel) anchor.rel = rel;
  if (options.title) anchor.title = options.title;

  return { anchor, state };
}
