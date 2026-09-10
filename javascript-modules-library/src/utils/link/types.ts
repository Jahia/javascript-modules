import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { RenderContext, Resource } from "org.jahia.services.render";

/**
 * What a link can point at: a node, an already-built URL, or nothing.
 *
 * Both `null` and `undefined` occur, and neither is an error: an unresolved reference yields the
 * JCR `null`, an unset property yields `undefined`. An unpublished target, a deleted one and one
 * the visitor may not read all collapse to the same value here, so a link cannot tell them apart.
 */
export type LinkTarget = JCRNodeWrapper | string | null | undefined;

/** The four values `jmix:link`'s `j:target` allows. */
export type LinkTargetAttribute = "_blank" | "_parent" | "_self" | "_top";

/**
 * Anchor attributes, spreadable onto an `<a>` as they are — every key is a valid one, by
 * construction, the same contract `ImgProps` has for `<img>`. This is also the shape to hand to an
 * Island, where a React element cannot travel: `<a {...anchor}>`.
 *
 * An empty object means the link is not navigable. There is no `href` to render, and the other
 * attributes have nothing to hang on.
 */
export interface AnchorProps {
  /**
   * A server-side intermediate, not the URL the visitor receives. Core completes it after the
   * render, and only where it is emitted as one of `URLTraverser`'s tag/attribute pairs — `a[href]`
   * among them — in an `html` template type. Copy it into a `data-*` attribute or an Island payload
   * and it stays un-rewritten: no vanity URL, no `?jsite=` cross-site parameter. Never
   * string-compare it.
   */
  href?: string;
  target?: LinkTargetAttribute;
  /** `"noopener noreferrer"` whenever `target` resolves to `_blank`. */
  rel?: string;
  title?: string;
}

/**
 * What the caller needs to know about the link that is not an anchor attribute.
 *
 * Never spread onto an `<a>`: none of these keys is a DOM attribute.
 */
export interface LinkState {
  /** False when there is no `href`. Render the children without an anchor. */
  navigable: boolean;
  /**
   * The target is the page being rendered. `<JLink>` turns it into `aria-current="page"`.
   *
   * A view that reads it must declare `cache.mainResource=true`, otherwise its fragment is cached
   * once and replayed on every page that shares it.
   */
  isCurrent: boolean;
  /** The page being rendered is the target or one of its descendants. Style with it. */
  isAncestor: boolean;
  /** The label to render when the caller provides no children. Empty when nothing supplies one. */
  label: string;
}

/** Everything a link needs to be rendered: the anchor attributes, and the rest. */
export interface LinkProps {
  anchor: AnchorProps;
  state: LinkState;
}

export interface LinkOptions {
  /** Query string parameters. Inserted before any fragment, on node and string targets alike. */
  parameters?: Record<string, string>;
  /** Fragment, without the leading `#`. Appended last, replacing a fragment the target carries. */
  hash?: string;
  /**
   * Language of the target. Also selects the language the URL points at.
   *
   * Both spellings of a locale are accepted: `"fr"`, `"fr_CH"` and `"fr-CH"` all name the same
   * language. Language-neutral content — a file, a folder — ignores it, since it has no translation
   * to point at.
   */
  language?: string;
  /**
   * With `language` set, require the target to exist in that language; a target that does not is
   * not navigable. Turn it off to link to the untranslated page anyway.
   *
   * @default true
   */
  requireTranslation?: boolean;
  /** Anchor `target`. Anything but the four `jmix:link` values omits the attribute. */
  target?: LinkTargetAttribute;
  /** Overrides the automatic `"noopener noreferrer"`. */
  rel?: string;
  title?: string;
  /** Overrides the derived label. */
  label?: string;
  /**
   * Overrides the computed value. A language switcher sets it: every entry points at the same page,
   * so identifier equality marks them all current.
   */
  isCurrent?: boolean;
  /**
   * Register a render cache dependency, so that changing the target flushes the fragments that link
   * to it.
   *
   * `true` (the default) picks the key form: `{ node }` when the target resolves, `{ uuid }` on the
   * raw reference when it does not, and nothing at all for a string target.
   *
   * Pass an explicit form to override. A loop over JCR query hits wants the `path` form, since it
   * holds paths rather than nodes; `flushOnPathMatchingRegexp` covers a set of paths at once.
   *
   * The `{ uuid }` form is meant to flush the fragment that fell back once its target is published,
   * but the engine drops it today: the tag it feeds resolves the UUID against a page context it has
   * not been given yet, and the failure is swallowed, so nothing is registered
   * ({@link https://github.com/Jahia/javascript-modules/issues/750}). The other three forms work.
   * Until that is fixed, a fragment that fell back is flushed by whatever else it depends on, or by
   * `flushOnPathMatchingRegexp` on the section the target will land in.
   *
   * @default true
   */
  cacheDependency?:
    | boolean
    | { node: JCRNodeWrapper }
    | { path: string }
    | { uuid: string }
    | { flushOnPathMatchingRegexp: string };
}

/**
 * The Jahia objects a link is resolved against. Pass `useServerContext()`; every field is optional
 * because each one only removes a capability when it is missing — no `renderContext` means no cache
 * dependency, no `mainNode` means no current-page state.
 */
export interface LinkContext {
  renderContext?: RenderContext;
  currentResource?: Resource;
  /** The node of the main resource — the page being rendered, not the node being rendered. */
  mainNode?: JCRNodeWrapper;
}
