import {
  Children,
  cloneElement,
  isValidElement,
  type AnchorHTMLAttributes,
  type JSX,
  type ReactElement,
  type ReactNode,
} from "react";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { useServerContext } from "../hooks/useServerContext.js";
import { getLinkProps } from "../utils/link/getLinkProps.js";
import { resolveContentLink, type LinkLabelSource } from "../utils/link/resolveContentLink.js";
import type { LinkOptions, LinkProps } from "../utils/link/types.js";

/**
 * Attributes spread onto the anchor last, after everything the component computed.
 *
 * A record covers the static ones — which a plain JSX attribute already expresses. The function
 * form is for a value that depends on the link the library resolved: an analytics attribute
 * carrying the final URL and the derived label, both of which the component computes and a call
 * site otherwise has no way to read back.
 *
 * It receives exactly what {@link getLinkProps} returns, so the same callback works on both tiers.
 */
export type ExtraAnchorAttributes =
  | Record<string, string | number | boolean | undefined>
  | ((link: LinkProps) => Record<string, string | number | boolean | undefined>);

/**
 * What `JLink` decides for itself.
 *
 * The HTML attributes it accepts are everything an `<a>` takes _minus these_ — derived, not
 * hand-listed, so adding a prop here can never silently swallow an attribute that used to reach the
 * element. `content` is in the list because it is both React's RDFa attribute and this component's
 * own prop name.
 */
interface JLinkOwnProps extends Pick<
  LinkOptions,
  | "allowedSchemes"
  | "parameters"
  | "hash"
  | "language"
  | "requireTranslation"
  | "target"
  | "rel"
  | "title"
  | "isCurrent"
  | "cacheDependency"
> {
  /** The node to link to. `null` and `undefined` are ordinary: the link is not navigable. */
  node?: JCRNodeWrapper | null;
  /** A content node carrying a link — a `jnt:nodeLink`, a `jnt:externalLink`, a CTA mixin. */
  content?: JCRNodeWrapper;
  /** An already-built URL. Goes through the scheme allow-list like any other string. */
  href?: string;
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
  /** Spread onto the anchor last. */
  attributes?: ExtraAnchorAttributes;
  /**
   * Render the single child element as the link instead of wrapping it in an `<a>`: the anchor
   * attributes are passed to it, and the element it renders is the one that carries the `href`.
   *
   * For a design system whose call to action is not a bare anchor. Next.js met the same need and
   * called it `passHref`.
   *
   * @default false
   */
  asChild?: boolean;
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
  /**
   * Properties holding the label of the link itself, tried in order. Name your own when the link is
   * a mixin on a node whose `jcr:title` is the heading rather than the link label.
   *
   * @default ["jcr:title", "j:linkTitle"]
   */
  labelProperties?: readonly string[];
  /**
   * Where the label comes from. `"target"` skips the content node and uses the displayable name of
   * whatever the link points at.
   *
   * @default "content"
   */
  labelFrom?: LinkLabelSource;
}

/** The keys of the discriminator, which only the `content` shape accepts. */
type JLinkDiscriminatorKey =
  | "typeProperty"
  | "noneValue"
  | "referenceProperties"
  | "urlProperty"
  | "labelProperties"
  | "labelFrom";

/** Everything the three shapes of `<JLink>` have in common. */
type JLinkCommon = Omit<JLinkOwnProps, "node" | "content" | "href" | JLinkDiscriminatorKey> &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof JLinkOwnProps>;

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
    } & JLinkCommon & { [K in JLinkDiscriminatorKey]?: never })
  | ({
      /** A content node carrying a link — a `jnt:nodeLink`, a `jnt:externalLink`, a CTA mixin. */
      content: JCRNodeWrapper;
      node?: never;
      href?: never;
    } & JLinkCommon &
      Pick<JLinkOwnProps, JLinkDiscriminatorKey>)
  | ({
      /** An already-built URL. Goes through the scheme allow-list like any other string. */
      href: string;
      node?: never;
      content?: never;
    } & JLinkCommon & { [K in JLinkDiscriminatorKey]?: never } & (
        | { children: ReactNode }
        | { "aria-label": string }
      ));

/**
 * The single element `asChild` hands the link to.
 *
 * The `Children` helpers are the only way to count children without assuming their shape, and
 * `asChild` is by definition the feature that clones one: there is no alternative form of "render
 * the caller's element as the link".
 */
/* eslint-disable @eslint-react/no-children-count, @eslint-react/no-children-to-array */
function onlyElement(children: ReactNode): ReactElement<Record<string, unknown>> {
  // `Children.only` throws React's own message on a text child, which names neither this component
  // nor the way out of the mistake
  const child = isValidElement(children)
    ? children
    : Children.count(children) === 1
      ? Children.toArray(children)[0]
      : undefined;
  if (!isValidElement(child)) {
    throw new Error(
      "JLink: asChild renders the child as the link, so it needs exactly one element child. " +
        "Drop asChild to have JLink render the <a> itself.",
    );
  }

  return child as ReactElement<Record<string, unknown>>;
}
/* eslint-enable @eslint-react/no-children-count, @eslint-react/no-children-to-array */

/**
 * Renders a link as a bare `<a>`: the URL, the validated `target` and its `rel`, `aria-current` on
 * the page being rendered, and a render cache dependency on the target.
 *
 * A target that does not resolve is the normal state of a link — publishing a page does not publish
 * the pages it links to — so this component never renders an `<a>` without an `href`. It renders
 * the children on their own instead, or nothing when `whenUnresolved` says so.
 *
 * The element carries no styling of its own: pass a `className`. Every other anchor attribute —
 * `onClick`, `hreflang`, `download` — is passed through, and `attributes` covers the ones React's
 * typings cannot model, `data-*` among them. Where the wrapper is not an anchor at all, `asChild`
 * hands the link to the element you render.
 *
 * Server-side only, because it registers the cache dependency. A client component receives link
 * data instead: build it with {@link getLinkProps} and spread it, `<a {...anchor}>`.
 *
 * @example
 *   ```tsx
 *   <JLink node={props["j:linknode"]} className={classes.cta}>{label}</JLink>
 *   <JLink content={currentNode} />
 *   <JLink node={article}><JImage node={cover} alt="" /></JLink>
 *   <JLink content={cta} attributes={({ anchor, state }) => ({
 *   "data-element-url": anchor.href,
 *   "data-element-text": state.label,
 *   })} />
 *   <JLink node={page} asChild><CTA variant="primary">Read more</CTA></JLink>
 *   ```;
 *
 * @returns The `<a>` element, the child `asChild` was given, or the unwrapped children when the
 *   link is not navigable.
 * @see {@link getLinkProps} for the semantics of every option.
 */
export function JLink(props: JLinkProps): JSX.Element | null {
  const {
    node,
    content,
    href,
    children,
    whenUnresolved = "children",
    attributes,
    asChild = false,
    allowedSchemes,
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
    labelProperties,
    labelFrom,
    // Whatever is left is an anchor attribute: everything this component consumes is named above,
    // so that a link option added later cannot reach the DOM.
    ...anchorAttributes
  } = props;

  const context = useServerContext();
  const options: LinkOptions = {
    allowedSchemes,
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
        {
          ...options,
          typeProperty,
          noneValue,
          referenceProperties,
          urlProperty,
          labelProperties,
          labelFrom,
        },
        context,
      )
    : getLinkProps(href ?? node, options, context);

  // Children win over the derived label, and a link with neither renders as nothing
  const body = children ?? link?.state.label;

  if (!link?.state.navigable) {
    if (whenUnresolved === "none") return null;
    // `asChild` still renders its child, just not as a link: a call to action that lost its target
    // is a call to action with no href, not a hole in the page
    return asChild ? onlyElement(children) : <>{body}</>;
  }

  // `state` is never spread: none of its keys is an anchor attribute
  const linkAttributes = {
    ...link.anchor,
    "aria-current": link.state.isCurrent ? ("page" as const) : undefined,
    ...anchorAttributes,
    ...(typeof attributes === "function" ? attributes(link) : attributes),
  };

  return asChild ? (
    // The whole point of asChild: the caller's element becomes the link
    // eslint-disable-next-line @eslint-react/no-clone-element
    cloneElement(onlyElement(children), linkAttributes)
  ) : (
    <a {...linkAttributes}>{body}</a>
  );
}
