import type { AnchorHTMLAttributes, JSX, ReactNode } from "react";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { useServerContext } from "../hooks/useServerContext.js";
import { getLinkProps } from "../utils/link/getLinkProps.js";
import { resolveContentLink } from "../utils/link/resolveContentLink.js";
import type { LinkOptions } from "../utils/link/types.js";

/** Everything the three shapes of `<JLink>` have in common. */
type JLinkCommon = {
  /** The content of the anchor. With none, the derived label is rendered instead. */
  children?: ReactNode;
  /**
   * What to render when the link is not navigable — an unresolved reference, a rejected URL, a
   * missing translation. `"children"` renders the children without an anchor, `"none"` renders
   * nothing at all.
   *
   * @default "children"
   */
  whenUnresolved?: "children" | "none";
} & Pick<
  LinkOptions,
  | "parameters"
  | "hash"
  | "language"
  | "requireTranslation"
  | "target"
  | "rel"
  | "title"
  | "isCurrent"
  | "cacheDependency"
> &
  // `content` is React's RDFa attribute, and it is this component's own prop name
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "target" | "rel" | "title" | "content">;

/** How {@link resolveContentLink} reads the link off the `content` node. */
type JLinkDiscriminator = {
  /**
   * Property saying which kind of link the content node carries. Only its "no link" value is read.
   * luxe uses `"ctaType"`, se-utils `"seu:linkType"`.
   *
   * @default "j:linkType"
   */
  typeProperty?: string;
  /**
   * The value of `typeProperty` that means "no link".
   *
   * @default "none"
   */
  noneValue?: string;
  /**
   * Reference properties holding an internal link, tried in order and ahead of `urlProperty`. The
   * empty array reads the external URL only.
   *
   * @default ["j:node", "j:linknode"]
   */
  referenceProperties?: readonly string[];
  /**
   * Property holding an external URL.
   *
   * @default "j:url"
   */
  urlProperty?: string;
};

/**
 * A discriminated union, so that naming two targets, or none, is a type error rather than prose.
 *
 * The `href` shape additionally requires `children` or `aria-label`: an anchor with no accessible
 * name is a WCAG 2.4.4 failure, and it is what `alt` protects against on `<JImage>`. The other two
 * shapes derive a label from the content, so they cannot end up nameless.
 */
export type JLinkProps =
  | ({
      /** The node to link to. `null` and `undefined` are ordinary: the link is not navigable. */
      node: JCRNodeWrapper | null | undefined;
      content?: never;
      href?: never;
    } & JLinkCommon & { [K in keyof JLinkDiscriminator]?: never })
  | ({
      /** A content node carrying a link — a `jnt:nodeLink`, a `jnt:externalLink`, a CTA mixin. */
      content: JCRNodeWrapper;
      node?: never;
      href?: never;
    } & JLinkCommon &
      JLinkDiscriminator)
  | ({
      /** An already-built URL. Goes through the scheme allow-list like any other string. */
      href: string;
      node?: never;
      content?: never;
    } & JLinkCommon & { [K in keyof JLinkDiscriminator]?: never } & (
        | { children: ReactNode }
        | { "aria-label": string }
      ));

/**
 * Renders a link as a bare `<a>`: the URL, the validated `target` and its `rel`, `aria-current` on
 * the page being rendered, and a render cache dependency on the target.
 *
 * A target that does not resolve is the normal state of a link — publishing a page does not publish
 * the pages it links to — so this component never renders an `<a>` without an `href`. It renders
 * the children on their own instead, or nothing when `whenUnresolved` says so.
 *
 * The element carries no styling of its own: pass a `className`. Every other anchor attribute —
 * `onClick`, `hreflang`, `download` — is passed through.
 *
 * Server-side only, because it registers the cache dependency. A client component receives link
 * data instead: build it with {@link getLinkProps} and spread it, `<a {...anchor}>`.
 *
 * @example
 *   ```tsx
 *   <JLink node={props["j:linknode"]} className={classes.cta}>{label}</JLink>
 *   <JLink content={currentNode} />
 *   <JLink node={article}><JImage node={cover} alt="" /></JLink>
 *   ```;
 *
 * @returns The `<a>` element, or the unwrapped children when the link is not navigable.
 * @see {@link getLinkProps} for the semantics of every option.
 */
export function JLink(props: JLinkProps): JSX.Element | null {
  const {
    node,
    content,
    href,
    children,
    whenUnresolved = "children",
    parameters,
    hash,
    language,
    requireTranslation,
    target,
    rel,
    title,
    isCurrent,
    cacheDependency,
    typeProperty,
    noneValue,
    referenceProperties,
    urlProperty,
    // Whatever is left is an anchor attribute: everything this component consumes is named above,
    // so that a link option added later cannot reach the DOM.
    ...anchorAttributes
  } = props;

  const context = useServerContext();
  const options: LinkOptions = {
    parameters,
    hash,
    language,
    requireTranslation,
    target,
    rel,
    title,
    isCurrent,
    cacheDependency,
  };

  const link = content
    ? resolveContentLink(
        content,
        { ...options, typeProperty, noneValue, referenceProperties, urlProperty },
        context,
      )
    : getLinkProps(href ?? node, options, context);

  // Children win over the derived label, and a link with neither renders as nothing
  const body = children ?? link?.state.label;

  if (!link?.state.navigable) {
    return whenUnresolved === "none" ? null : <>{body}</>;
  }

  return (
    // `state` is never spread: none of its keys is an anchor attribute
    <a
      {...link.anchor}
      aria-current={link.state.isCurrent ? "page" : undefined}
      {...anchorAttributes}
    >
      {body}
    </a>
  );
}
