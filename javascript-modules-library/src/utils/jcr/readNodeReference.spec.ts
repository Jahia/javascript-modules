import { describe, expect, it } from "vitest";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { readNodeReference } from "./readNodeReference.js";

const target = { getPath: () => "/sites/test/news" } as unknown as JCRNodeWrapper;

/**
 * A node carrying reference properties, each described by the UUID it stores and — when it resolves
 * — the node behind it.
 */
const jcrNode = (references: Record<string, { uuid: string; target?: JCRNodeWrapper }>) =>
  ({
    hasProperty: (property: string) => property in references,
    getPropertyAsString: (property: string) => references[property]?.uuid ?? null,
    getProperty: (property: string) => ({
      getValue: () => ({
        getNode: () => {
          // An unresolvable reference throws, it does not return null
          if (!references[property].target) throw new Error("ItemNotFoundException");
          return references[property].target;
        },
      }),
    }),
  }) as unknown as JCRNodeWrapper;

describe("readNodeReference", () => {
  it("returns both ends of a reference that resolves", () => {
    const node = jcrNode({ "example:related": { uuid: "u-news", target } });
    expect(readNodeReference(node, "example:related")).toEqual({ node: target, uuid: "u-news" });
  });

  it("separates an unset property from one whose target is gone", () => {
    const unset = jcrNode({});
    expect(readNodeReference(unset, "example:related")).toBeNull();

    const dangling = jcrNode({ "example:related": { uuid: "u-draft" } });
    expect(readNodeReference(dangling, "example:related")).toEqual({
      node: undefined,
      uuid: "u-draft",
    });
  });

  it("treats an empty or whitespace-only value as unset", () => {
    for (const uuid of ["", "   ", "\t"]) {
      expect(readNodeReference(jcrNode({ "example:related": { uuid } }), "example:related")).toBe(
        null,
      );
    }
  });

  it("absorbs a node that cannot answer at all", () => {
    const dead = new Proxy({} as JCRNodeWrapper, {
      get: () => () => {
        throw new Error("RepositoryException");
      },
    });
    expect(() => readNodeReference(dead, "example:related")).not.toThrow();
    expect(readNodeReference(dead, "example:related")).toBeNull();
  });

  it("answers for a missing node rather than throwing on it", () => {
    expect(readNodeReference(undefined as unknown as JCRNodeWrapper, "example:related")).toBeNull();
  });
});
