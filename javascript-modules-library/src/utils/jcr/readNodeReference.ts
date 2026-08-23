import type { JCRNodeWrapper } from "org.jahia.services.content";

/**
 * Both ends of a reference property: the node it resolves to, and the raw value it stores.
 *
 * The two are independent. A property that is set but whose target the visitor cannot reach yields
 * a `uuid` and no `node` — the ordinary state of a link to an unpublished page. The reverse never
 * happens.
 */
export interface NodeReference {
  /** The referenced node, or `undefined` when the reference does not resolve. */
  node?: JCRNodeWrapper;
  /**
   * The identifier the property stores, present whenever the property is set.
   *
   * Only ever a cache-dependency key. A node the visitor may not read still yields it, so putting
   * it in an `href` or a label would both leak a target's existence and point at nothing.
   */
  uuid?: string;
}

/**
 * Reads a `reference` or `weakreference` property without letting it break the render.
 *
 * A reference that no longer resolves throws from `getNode()` rather than returning null, and a
 * `getNodeProps` read surfaces that as a plain falsy value — which is why every view that touches a
 * reference ends up writing the same try/catch. This is that try/catch, once.
 *
 * It also separates the two cases the falsy value merges: an unset property returns `null`, a set
 * one whose target is gone returns a `uuid` with no `node`. What it cannot separate is _why_ the
 * target is gone — unpublished, deleted, and not readable by this visitor all arrive here
 * identically, and no JCR read can tell them apart.
 *
 * @example
 *   ```ts
 *   const related = readNodeReference(currentNode, "example:related")?.node;
 *   ```;
 *
 * @param node - The node carrying the property.
 * @param property - The reference property to read.
 * @returns The reference, or `null` when the property is unset, empty or unreadable. Never throws.
 * @see {@link getNodeProps} for reading the ordinary property types.
 */
export function readNodeReference(node: JCRNodeWrapper, property: string): NodeReference | null {
  if (!node) return null;

  let uuid: string | undefined;
  let referenced: JCRNodeWrapper | undefined;

  try {
    if (!node.hasProperty(property)) return null;
    const raw = node.getPropertyAsString(property);
    uuid = raw && raw.trim() ? raw : undefined;
    referenced = node.getProperty(property).getValue().getNode() ?? undefined;
  } catch {
    // The set-but-unresolvable case, and the case this function exists for
    referenced = undefined;
  }

  return referenced || uuid ? { node: referenced, uuid } : null;
}
