import type { JCRNodeWrapper } from "org.jahia.services.content";
import { readNodeReference } from "../jcr/readNodeReference.js";
import { getLinkProps } from "./getLinkProps.js";
import type { LinkContext, LinkOptions, LinkProps, LinkTargetAttribute } from "./types.js";

/**
 * Reference properties that carry an internal link, in lookup order: core's `jnt:nodeLink`, then
 * the `jmix:internalLink` of the Jahia/default module.
 */
const REFERENCE_PROPERTIES: readonly string[] = ["j:node", "j:linknode"];

/** The label of the link itself: `mix:title`, then `jmix:externalLink`. */
const TITLE_PROPERTIES: readonly string[] = ["jcr:title", "j:linkTitle"];

/** Where {@link resolveContentLink} takes the label from. */
export type LinkLabelSource = "content" | "target";

/** A property read as a string, or `undefined` when it is absent, empty, or unreadable. */
function readString(node: JCRNodeWrapper, property: string): string | undefined {
  try {
    if (!node.hasProperty(property)) return undefined;
    const value = node.getPropertyAsString(property);
    return value && value.trim() ? value : undefined;
  } catch {
    return undefined;
  }
}

/** The first of these properties the node carries. */
const readFirst = (node: JCRNodeWrapper, properties: readonly string[]): string | undefined =>
  properties.reduce<string | undefined>(
    (found, property) => found ?? readString(node, property),
    undefined,
  );

/**
 * Reads a link off a content node, and turns it into the props of an anchor.
 *
 * It handles core's own link types — `jnt:nodeLink` (`j:node`) and `jnt:externalLink` (`j:url`) —
 * plus `jmix:link`'s `j:target` and `mix:title`'s `jcr:title`. It also handles the `j:linkType`
 * convention, which is not core: it ships in the Jahia/default module, with `jmix:internalLink`
 * (`j:linknode`) and `jmix:externalLink` (`j:url`, `j:linkTitle`). Because that is a module
 * convention, and three other spellings of it exist in the wild, the discriminator is a parameter.
 *
 * The discriminator only ever says "no link": every vocabulary spells that value differently but
 * agrees on having one, whereas their other values are incompatible. Which link to read is decided
 * by which property is filled — every reference property in `referenceProperties`, in order, then
 * the external URL.
 *
 * That precedence has a hazard worth knowing: an editor who switches a link from internal to
 * external leaves the reference property behind if the definition does not clear it, and this
 * function then renders the abandoned internal target rather than the URL the editor typed. Name
 * the properties to read when it matters — `referenceProperties: []` forces the external branch.
 *
 * The external URL goes through the same scheme allow-list as any other author-supplied string. An
 * internal reference that does not resolve returns a link that is not navigable, carrying a cache
 * dependency on the raw reference, rather than nothing at all.
 *
 * The label follows the same rule as the link itself: it is read off the content node, which is
 * right when the link _is_ the content and wrong when the link is a mixin on something else. A
 * mixin sits on a node whose `jcr:title` is the heading, not the link label — `labelProperties` and
 * `labelFrom` say where the label really lives.
 *
 * @example
 *   ```tsx
 *   const link = resolveContentLink(currentNode, {}, useServerContext());
 *   return link?.state.navigable ? <a {...link.anchor}>{link.state.label}</a> : null;
 *   ```;
 *
 * @param node - The content node carrying the link.
 * @param options - Everything {@link getLinkProps} takes, plus the properties to read and where the
 *   label comes from.
 * @param context - What the link is resolved against. Pass `useServerContext()`; see
 *   {@link getLinkProps} for what omitting it costs.
 * @returns The link props, or `null` when the node carries no link at all. Never throws.
 * @see {@link getLinkProps} for the semantics of the props it returns.
 */
export function resolveContentLink(
  node: JCRNodeWrapper,
  options: LinkOptions & {
    /** Discriminator property. luxe uses `"ctaType"`, se-utils `"seu:linkType"`. */
    typeProperty?: string;
    /** The discriminator value that means "no link". */
    noneValue?: string;
    /**
     * Reference properties holding an internal link, tried in order and ahead of `urlProperty`. The
     * empty array reads the external URL only, which is how a caller that knows the link is
     * external steps around a reference property an earlier edit left behind.
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
     * Properties holding the label of the link itself, tried in order.
     *
     * The default is right when the link _is_ the content, and wrong when the link is a mixin on
     * something else: a CTA mixin sits on a card or a hero whose `jcr:title` is the heading, not
     * the link label. Name the label property of your own mixin, or pass `[]` to fall through to
     * the target's own name.
     *
     * @default ["jcr:title", "j:linkTitle"]
     */
    labelProperties?: readonly string[];
    /**
     * Where the label comes from. `"target"` skips the content node entirely and uses the
     * displayable name of whatever the link points at — the readable spelling of `labelProperties:
     * []`, and what a mixin-shaped link usually wants.
     *
     * It takes precedence: `labelFrom: "target"` ignores `labelProperties`.
     *
     * @default "content"
     */
    labelFrom?: LinkLabelSource;
  } = {},
  context?: LinkContext,
): LinkProps | null {
  if (!node) return null;

  const {
    typeProperty = "j:linkType",
    noneValue = "none",
    referenceProperties = REFERENCE_PROPERTIES,
    urlProperty = "j:url",
    labelProperties = TITLE_PROPERTIES,
    labelFrom = "content",
    ...linkOptions
  } = options;
  if (readString(node, typeProperty)?.trim() === noneValue) return null;

  // No label here means the props tier derives one from the target, which is what "target" asks for
  const contentLabel = labelFrom === "target" ? undefined : readFirst(node, labelProperties);

  const shared: LinkOptions = {
    ...linkOptions,
    label: linkOptions.label ?? contentLabel,
    // A content value, so it may be anything; getLinkProps drops what is not a jmix:link target
    target: linkOptions.target ?? (readString(node, "j:target") as LinkTargetAttribute | undefined),
  };

  for (const property of referenceProperties) {
    const reference = readNodeReference(node, property);
    if (!reference) continue;

    // `true` and the default both mean "pick the key form", and the UUID of an unresolved
    // reference is only in hand here: the props tier receives nothing it could derive it from
    const automatic = shared.cacheDependency === undefined || shared.cacheDependency === true;
    const cacheDependency =
      automatic && !reference.node && reference.uuid
        ? { uuid: reference.uuid }
        : shared.cacheDependency;

    return getLinkProps(reference.node, { ...shared, cacheDependency }, context);
  }

  const url = readString(node, urlProperty);
  return url ? getLinkProps(url, shared, context) : null;
}
