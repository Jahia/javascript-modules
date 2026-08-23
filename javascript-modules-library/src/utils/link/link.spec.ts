import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { RenderContext } from "org.jahia.services.render";
import type { LinkTargetAttribute } from "./types.js";

// `buildNodeUrl` reaches into the Jahia render context, which only exists inside the engine. The
// mock reproduces the shape of its two branches, and the three ways it fails to produce a URL: a
// falsy node and an un-inferrable mode both throw, and `getUrl()` returns null on a repository
// error. Those are the failures the props tier has to absorb rather than propagate.
vi.mock("../urlBuilder/urlBuilder.js", async (importOriginal) => ({
  // The rest of the URL tier is pure string work, and the link code shares it rather than
  // reimplementing it: keep the real thing
  ...(await importOriginal<typeof import("../urlBuilder/urlBuilder.js")>()),
  buildNodeUrl: (
    node: { getUrl: () => string | null; getPath: () => string },
    config: { language?: string } = {},
    context: { renderContext?: unknown } = {},
  ) => {
    if (!node) throw new Error("Expected a node in buildNodeUrl, received undefined");

    // Passing a language takes the manual branch, which needs a mode it can only get from the
    // render context
    if (config.language) {
      if (!context.renderContext) {
        throw new Error("buildNodeUrl: mode is not defined and cannot be inferred.");
      }
      return `/cms/render/live/${config.language}${node.getPath()}.html`;
    }

    return node.getUrl();
  },
}));

const { getLinkProps } = await import("./getLinkProps.js");
const { resolveContentLink } = await import("./resolveContentLink.js");
const { setLinkDefaults, clearLinkDefaults } = await import("./linkDefaults.js");

/** A reference property: the UUID it stores, and the node it resolves to — when it does. */
interface Reference {
  uuid: string;
  target?: JCRNodeWrapper;
}

/**
 * A JCR node with just the surface the link code touches.
 *
 * `locales: undefined` models language-neutral content — a file, a folder — which reports no
 * translations at all, as opposed to content translated into some languages and not others.
 */
const jcrNode = ({
  identifier = "u-1",
  path = "/sites/test/home",
  url,
  displayableName = "Home",
  strings = {},
  multiple = {},
  references = {},
  locales,
  unreadable = false,
}: {
  identifier?: string;
  path?: string;
  url?: string | null;
  displayableName?: string;
  strings?: Record<string, string>;
  multiple?: Record<string, string[]>;
  references?: Record<string, Reference>;
  locales?: string[];
  unreadable?: boolean;
} = {}) =>
  ({
    getIdentifier: () => {
      if (unreadable) throw new Error("RepositoryException");
      return identifier;
    },
    getPath: () => path,
    getCanonicalPath: () => path,
    getDisplayableName: () => displayableName,
    // getUrl() returns null rather than throwing when the repository cannot answer
    getUrl: () => (url === undefined ? `${path}.html` : url),
    hasProperty: (property: string) =>
      property in strings || property in multiple || property in references,
    getPropertyAsString: (property: string) =>
      // A reference reports its target's UUID, whether or not the visitor may read that target
      property in references ? references[property].uuid : (strings[property] ?? null),
    getProperty: (property: string) => {
      if (property in multiple) {
        return { getValues: () => multiple[property].map((value) => ({ getString: () => value })) };
      }

      if (property in references) {
        const { target } = references[property];
        return {
          getValue: () => ({
            getNode: () => {
              // An unresolvable reference throws, it does not return null
              if (!target) throw new Error("ItemNotFoundException");
              return target;
            },
          }),
        };
      }

      // A JCR node throws PathNotFoundException on a property it does not have
      throw new Error(`no such property: ${property}`);
    },
    hasTranslations: () => locales !== undefined,
    getExistingLocales: () => (locales ?? []).map((tag) => ({ toString: () => tag })),
  }) as unknown as JCRNodeWrapper;

const addCacheDependency = vi.fn();
/** Only ever an opaque token here: the props tier passes it on, it never reads it. */
const renderContext = {} as RenderContext;

beforeEach(() => {
  /** The engine injects `server` as a global; a test provides only the part under test. */
  Reflect.set(globalThis, "server", { render: { addCacheDependency } });
});

afterEach(() => {
  vi.clearAllMocks();
  Reflect.deleteProperty(globalThis, "server");
});

describe("a target that cannot be linked to", () => {
  it("treats an absent target as a result, not an error", () => {
    for (const target of [null, undefined]) {
      const { anchor, state } = getLinkProps(target);
      expect(state.navigable).toBe(false);
      expect(anchor).toEqual({});
    }
  });

  it("rejects the empty and whitespace-only strings a content property yields", () => {
    for (const target of ["", " ", "   ", "\t", "\n", " \t\r\n "]) {
      expect(getLinkProps(target).state.navigable).toBe(false);
    }
  });

  it("survives a node whose URL the repository cannot produce", () => {
    expect(getLinkProps(jcrNode({ url: null })).state.navigable).toBe(false);
    expect(getLinkProps(jcrNode({ url: "" })).state.navigable).toBe(false);
  });

  it("absorbs a node that cannot answer anything at all", () => {
    const dead = new Proxy({} as JCRNodeWrapper, {
      get: () => () => {
        throw new Error("RepositoryException");
      },
    });
    expect(() => getLinkProps(dead, {}, { mainNode: dead })).not.toThrow();
    const { anchor, state } = getLinkProps(dead, {}, { mainNode: dead });
    expect(anchor).toEqual({});
    // The node is reported as it was handed in, unread: what it cannot answer is what is missing
    expect(state.node).toBe(dead);
    expect(Object.keys(state).sort()).toEqual([
      "isAncestor",
      "isCurrent",
      "label",
      "navigable",
      "node",
    ]);
    expect(state.navigable).toBe(false);
    expect(state.isCurrent).toBe(false);
    expect(state.isAncestor).toBe(false);
    expect(state.label).toBe("");
  });

  it("never emits an anchor attribute with nothing to hang on", () => {
    const { anchor } = getLinkProps(null, {
      target: "_blank",
      rel: "nofollow",
      title: "Read more",
    });
    expect(anchor).toEqual({});
  });
});

describe("the scheme allow-list", () => {
  it.each([
    "https://example.com/a",
    "http://example.com/a",
    "mailto:someone@example.com",
    "tel:+33123456789",
    "ftp://files.example.com/a.txt",
    "/search",
    "#main",
  ])("navigates to %s", (url) => {
    expect(getLinkProps(url).anchor.href).toBe(url);
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "blob:https://example.com/1234",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
    "relative/path",
    // A leading `//` or `/\` is an authority, not a path: both leave the site under whatever
    // scheme the page was served with, and neither carries a scheme the allow-list could judge
    "//evil.example/phish",
    String.raw`/\evil.example/phish`,
    "//evil.example",
    String.raw`\\evil.example/phish`,
  ])("refuses %s", (url) => {
    const { anchor, state } = getLinkProps(url);
    expect(state.navigable).toBe(false);
    expect(anchor.href).toBeUndefined();
  });

  it.each([
    ["leading whitespace", "  javascript:alert(1)"],
    ["a leading control character", "\u0001javascript:alert(1)"],
    ["a leading newline", "\njavascript:alert(1)"],
    ["mixed case", "JaVaScRiPt:alert(1)"],
    ["an embedded tab", "java\tscript:alert(1)"],
    ["an embedded newline", "java\nscript:alert(1)"],
    ["an embedded carriage return", "java\rscript:alert(1)"],
    ["all of them at once", "  \u0002Ja\tVa\nScRiPt:alert(1)"],
  ])("refuses a scheme hidden behind %s", (_, url) => {
    expect(getLinkProps(url).state.navigable).toBe(false);
  });

  it("judges the URL a browser would act on, not the one the author typed", () => {
    // The same normalisation that unmasks javascript: also has to keep a valid URL valid
    expect(getLinkProps("  https://example.com/a  ").anchor.href).toBe("https://example.com/a");
  });
});

describe("target and rel", () => {
  it("adds rel to a link that opens a new browsing context", () => {
    expect(getLinkProps("https://example.com", { target: "_blank" }).anchor).toEqual({
      href: "https://example.com",
      target: "_blank",
      rel: "noopener noreferrer",
    });
  });

  it("leaves the other three browsing contexts without a rel", () => {
    for (const target of ["_self", "_parent", "_top"] as const) {
      const { anchor } = getLinkProps("https://example.com", { target });
      expect(anchor.target).toBe(target);
      expect(anchor).not.toHaveProperty("rel");
    }
  });

  it("omits the attribute entirely for a value jmix:link does not allow", () => {
    // The value comes from content, so it can be anything an editor or an import put there
    const { anchor } = getLinkProps("https://example.com", {
      target: "popup" as LinkTargetAttribute,
    });
    expect(anchor).not.toHaveProperty("target");
    expect(anchor).not.toHaveProperty("rel");
  });

  it("omits the attribute when no target is asked for, rather than emitting an empty one", () => {
    expect(getLinkProps("https://example.com").anchor).toEqual({ href: "https://example.com" });
  });

  it("lets an explicit rel replace the automatic one", () => {
    expect(
      getLinkProps("https://example.com", { target: "_blank", rel: "nofollow" }).anchor.rel,
    ).toBe("nofollow");
  });

  it("keeps a title only when there is one", () => {
    expect(getLinkProps("https://example.com", { title: "Docs" }).anchor.title).toBe("Docs");
    expect(getLinkProps("https://example.com", { title: "" }).anchor).not.toHaveProperty("title");
  });
});

describe("current-page state", () => {
  const mainNode = jcrNode({ identifier: "u-home", path: "/sites/test/home" });

  it("compares nodes by identifier, because two proxies of one node are two objects", () => {
    const sameNodeAgain = jcrNode({ identifier: "u-home", path: "/sites/test/home" });
    expect(sameNodeAgain).not.toBe(mainNode);
    expect(getLinkProps(sameNodeAgain, {}, { mainNode }).state.isCurrent).toBe(true);
  });

  it("is not current when the identifier differs, whatever the path suggests", () => {
    const other = jcrNode({ identifier: "u-other", path: "/sites/test/home" });
    expect(getLinkProps(other, {}, { mainNode }).state.isCurrent).toBe(false);
  });

  it("lets the caller override it, which is what a language switcher needs", () => {
    const other = jcrNode({ identifier: "u-other", path: "/sites/test/other" });
    expect(getLinkProps(other, { isCurrent: true }, { mainNode }).state.isCurrent).toBe(true);
    // An override of false has to survive too: the entry for the language already displayed
    expect(getLinkProps(mainNode, { isCurrent: false }, { mainNode }).state.isCurrent).toBe(false);
  });

  it("is never current without a main node to compare against", () => {
    expect(getLinkProps(mainNode).state.isCurrent).toBe(false);
    expect(getLinkProps("/sites/test/home.html", {}, { mainNode }).state.isCurrent).toBe(false);
  });

  it("says nothing rather than guessing when a node cannot be read", () => {
    const gone = jcrNode({ identifier: "u-home", unreadable: true });
    expect(getLinkProps(gone, {}, { mainNode }).state.isCurrent).toBe(false);
  });

  it("tests ancestry by path segment, so /home/news does not swallow /home/newsletter", () => {
    const news = jcrNode({ identifier: "u-news", path: "/sites/test/home/news" });
    const onNewsletter = jcrNode({
      identifier: "u-newsletter",
      path: "/sites/test/home/newsletter",
    });
    const onArticle = jcrNode({
      identifier: "u-article",
      path: "/sites/test/home/news/2026/a-story",
    });

    expect(getLinkProps(news, {}, { mainNode: onNewsletter }).state.isAncestor).toBe(false);
    expect(getLinkProps(news, {}, { mainNode: onArticle }).state.isAncestor).toBe(true);
    // A page is its own ancestor for this purpose: the nav entry is in path either way
    expect(getLinkProps(news, {}, { mainNode: news }).state.isAncestor).toBe(true);
  });

  it("is not an ancestor of anything when the target is a bare URL", () => {
    expect(getLinkProps("/sites/test/home.html", {}, { mainNode }).state.isAncestor).toBe(false);
  });
});

describe("query string and fragment", () => {
  it("puts the query before the fragment on a node target", () => {
    const { anchor } = getLinkProps(jcrNode({ path: "/sites/test/home" }), {
      parameters: { page: "2", sort: "date" },
      hash: "results",
    });
    expect(anchor.href).toBe("/sites/test/home.html?page=2&sort=date#results");
  });

  it("puts the query before the fragment on a string target that is only a fragment", () => {
    // The URL tier splits on "?" alone, which would turn a skip link into "#main?utm=a"
    expect(getLinkProps("#main", { parameters: { utm: "a" } }).anchor.href).toBe("?utm=a#main");
  });

  it("keeps the query ahead of a fragment the target already carries", () => {
    expect(getLinkProps("/docs#install", { parameters: { v: "2" } }).anchor.href).toBe(
      "/docs?v=2#install",
    );
  });

  it("replaces a fragment the target carries when one is asked for", () => {
    expect(getLinkProps("/docs#install", { hash: "upgrade" }).anchor.href).toBe("/docs#upgrade");
    expect(getLinkProps("/docs#install", { hash: "#upgrade" }).anchor.href).toBe("/docs#upgrade");
  });

  it("joins onto a query the URL already has", () => {
    expect(
      getLinkProps(jcrNode({ url: "/home.html?jsite=abc" }), { parameters: { page: "2" } }).anchor
        .href,
    ).toBe("/home.html?jsite=abc&page=2");
  });

  it("encodes both halves of a parameter", () => {
    expect(getLinkProps("/search", { parameters: { "q term": "a&b=c" } }).anchor.href).toBe(
      "/search?q%20term=a%26b%3Dc",
    );
  });

  it("adds nothing when there is nothing to add", () => {
    expect(getLinkProps("/docs", { parameters: {} }).anchor.href).toBe("/docs");
  });
});

describe("the label", () => {
  it("falls back to the displayable name, which already knows the JCR title rules", () => {
    expect(getLinkProps(jcrNode({ displayableName: "Latest news" })).state.label).toBe(
      "Latest news",
    );
  });

  it("prefers an explicit label", () => {
    expect(
      getLinkProps(jcrNode({ displayableName: "Latest news" }), { label: "Read more" }).state.label,
    ).toBe("Read more");
  });

  it("is empty rather than undefined when nothing supplies one", () => {
    expect(getLinkProps("https://example.com").state.label).toBe("");
    expect(getLinkProps(null).state.label).toBe("");
  });

  it("is still available on a link that is not navigable", () => {
    const { state } = getLinkProps(jcrNode({ url: null, displayableName: "Latest news" }));
    expect(state.navigable).toBe(false);
    expect(state.label).toBe("Latest news");
  });
});

describe("linking into a language", () => {
  const context = { renderContext };

  it("points at the requested language", () => {
    const node = jcrNode({ path: "/sites/test/home", locales: ["en", "fr"] });
    expect(getLinkProps(node, { language: "fr" }, context).anchor.href).toBe(
      "/cms/render/live/fr/sites/test/home.html",
    );
  });

  it("refuses to link to a page that does not exist in that language", () => {
    const node = jcrNode({ locales: ["en"] });
    expect(getLinkProps(node, { language: "fr" }, context).state.navigable).toBe(false);
  });

  it("links anyway when the caller turns the requirement off", () => {
    const node = jcrNode({ locales: ["en"] });
    const { state } = getLinkProps(node, { language: "fr", requireTranslation: false }, context);
    expect(state.navigable).toBe(true);
  });

  it("leaves language-neutral content alone, since a file has no translations to have", () => {
    const file = jcrNode({ path: "/sites/test/files/a.pdf" });
    expect(getLinkProps(file, { language: "fr" }, context).state.navigable).toBe(true);
  });

  it("keeps the URL the repository gives a file, which a language would replace with a page URL", () => {
    // Asking for a language takes the URL tier down its manual branch, which hand-builds a
    // `/cms/render/...` page URL and loses the `/files/...` form that actually serves the file
    const file = jcrNode({ path: "/sites/test/files/a.pdf", url: "/files/live/a.pdf" });
    expect(getLinkProps(file, { language: "fr" }, context).anchor.href).toBe("/files/live/a.pdf");
  });

  it("honours j:invalidLanguages, which marks a translation the editor disabled", () => {
    const node = jcrNode({ locales: ["en", "fr"], multiple: { "j:invalidLanguages": ["fr"] } });
    expect(getLinkProps(node, { language: "fr" }, context).state.navigable).toBe(false);
    expect(getLinkProps(node, { language: "en" }, context).state.navigable).toBe(true);
  });

  it("accepts any region of a bare language, so fr reaches a site running fr_CH", () => {
    const node = jcrNode({ locales: ["fr_CH"] });
    expect(getLinkProps(node, { language: "fr" }, context).state.navigable).toBe(true);
    // A request for one region is not satisfied by another
    expect(getLinkProps(node, { language: "fr_BE" }, context).state.navigable).toBe(false);
  });

  it("reads a locale in either spelling, since a JS caller writes fr-CH and Java writes fr_CH", () => {
    const node = jcrNode({ locales: ["fr_CH"] });
    expect(getLinkProps(node, { language: "fr-CH" }, context).state.navigable).toBe(true);
    expect(getLinkProps(node, { language: "fr-BE" }, context).state.navigable).toBe(false);
  });

  it("matches j:invalidLanguages in either spelling too", () => {
    const node = jcrNode({ locales: ["fr_CH"], multiple: { "j:invalidLanguages": ["fr_CH"] } });
    expect(getLinkProps(node, { language: "fr-CH" }, context).state.navigable).toBe(false);
  });

  it("does not throw when the URL cannot be built for that language", () => {
    const node = jcrNode({ locales: ["fr"] });
    // No render context, so the mode cannot be inferred and the URL tier throws
    expect(() => getLinkProps(node, { language: "fr" })).not.toThrow();
    expect(getLinkProps(node, { language: "fr" }).state.navigable).toBe(false);
  });
});

describe("the render cache dependency", () => {
  it("registers on the node the link resolved to", () => {
    const node = jcrNode();
    getLinkProps(node, {}, { renderContext });
    expect(addCacheDependency).toHaveBeenCalledExactlyOnceWith({ node }, renderContext);
  });

  it("registers nothing without a render context to register against", () => {
    getLinkProps(jcrNode(), {}, {});
    getLinkProps(jcrNode());
    expect(addCacheDependency).not.toHaveBeenCalled();
  });

  it("registers nothing for a string target, which names no node to depend on", () => {
    getLinkProps("https://example.com", { cacheDependency: true }, { renderContext });
    expect(addCacheDependency).not.toHaveBeenCalled();
  });

  it("can be turned off", () => {
    getLinkProps(jcrNode(), { cacheDependency: false }, { renderContext });
    expect(addCacheDependency).not.toHaveBeenCalled();
  });

  it("takes the path form a JCR query loop has, rather than a node", () => {
    getLinkProps(
      "/sites/test/home.html",
      { cacheDependency: { path: "/sites/test/home" } },
      { renderContext },
    );
    expect(addCacheDependency).toHaveBeenCalledExactlyOnceWith(
      { path: "/sites/test/home" },
      renderContext,
    );
  });

  it("takes the uuid form even when the target did not resolve", () => {
    getLinkProps(null, { cacheDependency: { uuid: "u-missing" } }, { renderContext });
    expect(addCacheDependency).toHaveBeenCalledExactlyOnceWith(
      { uuid: "u-missing" },
      renderContext,
    );
  });

  it("registers even when the link is not navigable, which is when it matters most", () => {
    const node = jcrNode({ url: null });
    const { state } = getLinkProps(node, {}, { renderContext });
    expect(state.navigable).toBe(false);
    expect(addCacheDependency).toHaveBeenCalledExactlyOnceWith({ node }, renderContext);
  });
});

describe("resolveContentLink", () => {
  const context = { renderContext };
  const target = jcrNode({
    identifier: "u-target",
    path: "/sites/test/home/news",
    displayableName: "News",
  });

  it("reads core's jnt:nodeLink", () => {
    const link = resolveContentLink(
      jcrNode({ references: { "j:node": { uuid: "u-target", target } } }),
      {},
      context,
    );
    expect(link?.anchor.href).toBe("/sites/test/home/news.html");
    expect(link?.state.label).toBe("News");
    expect(addCacheDependency).toHaveBeenCalledExactlyOnceWith({ node: target }, renderContext);
  });

  it("reads core's jnt:externalLink", () => {
    const link = resolveContentLink(
      jcrNode({ strings: { "j:url": "https://example.com/a" } }),
      {},
      context,
    );
    expect(link?.anchor.href).toBe("https://example.com/a");
  });

  it("reads the jmix:internalLink of the Jahia/default module", () => {
    const link = resolveContentLink(
      jcrNode({ references: { "j:linknode": { uuid: "u-target", target } } }),
      {},
      context,
    );
    expect(link?.anchor.href).toBe("/sites/test/home/news.html");
  });

  it("returns nothing when the discriminator says there is no link", () => {
    const node = jcrNode({
      strings: { "j:linkType": "none", "j:url": "https://example.com" },
    });
    expect(resolveContentLink(node, {}, context)).toBeNull();
  });

  it("reads the discriminator the project actually uses", () => {
    const node = jcrNode({
      strings: { "ctaType": "none", "j:url": "https://example.com" },
    });
    // Under its own name it means "no link"
    expect(resolveContentLink(node, { typeProperty: "ctaType" }, context)).toBeNull();
    // Under the default name nothing says so, and the link is read as usual
    expect(resolveContentLink(node, {}, context)?.anchor.href).toBe("https://example.com");
  });

  it("takes the value that means no link as a parameter too", () => {
    const node = jcrNode({
      strings: { "seu:linkType": "self", "j:url": "https://example.com" },
    });
    expect(
      resolveContentLink(node, { typeProperty: "seu:linkType", noneValue: "self" }, context),
    ).toBeNull();
  });

  it("puts an author-supplied j:url through the same allow-list as any other string", () => {
    const node = jcrNode({ strings: { "j:url": "javascript:alert(1)" } });
    const link = resolveContentLink(node, {}, context);
    expect(link?.state.navigable).toBe(false);
    expect(link?.anchor.href).toBeUndefined();
  });

  it("returns nothing at all when the node carries no link", () => {
    expect(resolveContentLink(jcrNode({ strings: { "jcr:title": "A card" } }), {}, context)).toBe(
      null,
    );
  });

  it("reads the anchor target and title off the content", () => {
    const node = jcrNode({
      strings: { "j:url": "https://example.com", "j:target": "_blank", "jcr:title": "Our partner" },
    });
    const link = resolveContentLink(node, {}, context);
    expect(link?.anchor).toEqual({
      href: "https://example.com",
      target: "_blank",
      rel: "noopener noreferrer",
    });
    expect(link?.state.label).toBe("Our partner");
  });

  it("drops a j:target an editor or an import left as something else", () => {
    const node = jcrNode({ strings: { "j:url": "https://example.com", "j:target": "new" } });
    expect(resolveContentLink(node, {}, context)?.anchor).not.toHaveProperty("target");
  });

  describe("a reference that does not resolve", () => {
    const dangling = () =>
      jcrNode({
        strings: { "jcr:title": "Coming soon" },
        references: { "j:linknode": { uuid: "u-unpublished" } },
      });

    it("is not navigable, and never falls back to the raw UUID", () => {
      const link = resolveContentLink(dangling(), {}, context);
      expect(link).not.toBeNull();
      expect(link?.state.navigable).toBe(false);
      expect(link?.anchor.href).toBeUndefined();
      expect(link?.state.label).toBe("Coming soon");
      expect(JSON.stringify(link)).not.toContain("u-unpublished");
    });

    // What the engine does with the { uuid } key is out of this tier's hands, and today it drops
    // it — see LinkOptions.cacheDependency. These tests pin the key the library hands over.
    it("depends on the UUID, which is all the unresolved reference gives it", () => {
      resolveContentLink(dangling(), {}, context);
      expect(addCacheDependency).toHaveBeenCalledExactlyOnceWith(
        { uuid: "u-unpublished" },
        renderContext,
      );
    });

    it("still depends on the UUID when the default is spelled out", () => {
      // `true` means "pick the key form automatically", which for an unresolved reference is
      // the UUID — passing the documented default must not silently register nothing
      resolveContentLink(dangling(), { cacheDependency: true }, context);
      expect(addCacheDependency).toHaveBeenCalledExactlyOnceWith(
        { uuid: "u-unpublished" },
        renderContext,
      );
    });

    it("registers nothing when the caller turns the dependency off", () => {
      resolveContentLink(dangling(), { cacheDependency: false }, context);
      expect(addCacheDependency).not.toHaveBeenCalled();
    });

    it("lets an explicit key form win", () => {
      resolveContentLink(dangling(), { cacheDependency: { path: "/sites/test/soon" } }, context);
      expect(addCacheDependency).toHaveBeenCalledExactlyOnceWith(
        { path: "/sites/test/soon" },
        renderContext,
      );
    });
  });

  it("puts an author-supplied j:url through the host check too", () => {
    const node = jcrNode({ strings: { "j:url": "//evil.example" } });
    expect(resolveContentLink(node, {}, context)?.state.navigable).toBe(false);
  });

  it("prefers the internal reference when the node carries both kinds of link", () => {
    const node = jcrNode({
      strings: { "j:url": "https://example.com" },
      references: { "j:node": { uuid: "u-target", target } },
    });
    expect(resolveContentLink(node, {}, context)?.anchor.href).toBe("/sites/test/home/news.html");
  });

  describe("a node that carries a reference the editor has moved on from", () => {
    // Switching a link from internal to external does not necessarily clear the reference the
    // editor filled in first, and the discriminator is never read as anything but "no link"
    const stale = () =>
      jcrNode({
        strings: { "j:linkType": "external", "j:url": "https://example.com" },
        references: { "j:node": { uuid: "u-target", target } },
      });

    it("still reads the reference, because the property being filled is what decides", () => {
      expect(resolveContentLink(stale(), {}, context)?.anchor.href).toBe(
        "/sites/test/home/news.html",
      );
    });

    it("reads the URL when the caller says which properties hold a reference", () => {
      const link = resolveContentLink(stale(), { referenceProperties: [] }, context);
      expect(link?.anchor.href).toBe("https://example.com");
    });

    it("reads the URL out of the property the caller names", () => {
      const node = jcrNode({ strings: { "cta:href": "https://example.com" } });
      const link = resolveContentLink(
        node,
        { referenceProperties: [], urlProperty: "cta:href" },
        context,
      );
      expect(link?.anchor.href).toBe("https://example.com");
    });
  });

  it("labels an untitled link node with the name of what it points at", () => {
    const node = jcrNode({ references: { "j:node": { uuid: "u-target", target } } });
    expect(resolveContentLink(node, {}, context)?.state.label).toBe("News");
  });

  it("prefers the title carried by the link itself", () => {
    const node = jcrNode({
      strings: { "jcr:title": "Read the announcement" },
      references: { "j:node": { uuid: "u-target", target } },
    });
    expect(resolveContentLink(node, {}, context)?.state.label).toBe("Read the announcement");
  });

  it("reads the j:linkTitle of the Jahia/default module", () => {
    const node = jcrNode({
      strings: { "j:url": "https://example.com", "j:linkTitle": "Our partner" },
    });
    expect(resolveContentLink(node, {}, context)?.state.label).toBe("Our partner");
  });

  it("answers the current-page question about the target, not about the link node", () => {
    const node = jcrNode({
      identifier: "u-cta",
      references: { "j:node": { uuid: "u-target", target } },
    });
    const link = resolveContentLink(node, {}, { renderContext, mainNode: target });
    expect(link?.state.isCurrent).toBe(true);
  });

  it("passes its options down to the props tier", () => {
    const node = jcrNode({ strings: { "j:url": "/search", "jcr:title": "Search" } });
    const link = resolveContentLink(
      node,
      { parameters: { q: "jahia" }, hash: "results", label: "Find" },
      context,
    );
    expect(link?.anchor.href).toBe("/search?q=jahia#results");
    expect(link?.state.label).toBe("Find");
  });
});

describe("narrowing the scheme allow-list", () => {
  afterEach(() => {
    clearLinkDefaults();
    Reflect.deleteProperty(globalThis, "bundleKey");
  });

  /** The engine sets this global while it evaluates a module's bundle. */
  const inModule = (name: string) => Reflect.set(globalThis, "bundleKey", name);

  it("refuses a scheme the call site left out", () => {
    const options = { allowedSchemes: ["https"] };
    expect(getLinkProps("https://example.com", options).state.navigable).toBe(true);
    expect(getLinkProps("http://example.com", options).state.navigable).toBe(false);
    expect(getLinkProps("mailto:someone@example.com", options).state.navigable).toBe(false);
  });

  it("narrows every link of the module that asked for it", () => {
    inModule("acme-module");
    setLinkDefaults({ allowedSchemes: ["https"] });

    const context = { bundleKey: "acme-module" };
    expect(getLinkProps("https://example.com", {}, context).state.navigable).toBe(true);
    expect(getLinkProps("http://example.com", {}, context).state.navigable).toBe(false);
  });

  it("leaves another module, and no module at all, on the built-in list", () => {
    inModule("acme-module");
    setLinkDefaults({ allowedSchemes: ["https"] });

    expect(
      getLinkProps("http://example.com", {}, { bundleKey: "other-module" }).state.navigable,
    ).toBe(true);
    expect(getLinkProps("http://example.com").state.navigable).toBe(true);
  });

  it("lets one call widen back to the module's own floor, and no further", () => {
    inModule("acme-module");
    setLinkDefaults({ allowedSchemes: ["https"] });

    const context = { bundleKey: "acme-module" };
    expect(
      getLinkProps("mailto:someone@example.com", { allowedSchemes: ["https", "mailto"] }, context)
        .state.navigable,
    ).toBe(true);
  });

  it("cannot be used to allow a scheme the library rejects", () => {
    for (const url of ["javascript:alert(1)", "data:text/html,x", "s3://bucket/key"]) {
      const scheme = url.slice(0, url.indexOf(":"));
      expect(getLinkProps(url, { allowedSchemes: [scheme, "https"] }).state.navigable).toBe(false);
    }
  });

  it("says so in development, rather than letting the links quietly disappear", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    Reflect.set(globalThis, "server", {
      render: { addCacheDependency },
      config: { isDevelopmentMode: () => true },
    });

    getLinkProps("s3://bucket/key", { allowedSchemes: ["https", "s3"] });
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain('"s3"');

    // A property of the code, not of the URL: the second call adds nothing
    getLinkProps("s3://other/key", { allowedSchemes: ["https", "s3"] });
    expect(warn).toHaveBeenCalledOnce();

    warn.mockRestore();
  });

  it("stays silent in production", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    Reflect.set(globalThis, "server", {
      render: { addCacheDependency },
      config: { isDevelopmentMode: () => false },
    });

    getLinkProps("gopher://example.com", { allowedSchemes: ["https", "gopher"] });
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("ignores the case and the whitespace a configuration value carries", () => {
    expect(
      getLinkProps("https://example.com", { allowedSchemes: [" HTTPS "] }).state.navigable,
    ).toBe(true);
  });

  it("refuses everything when the list is empty, which is a policy and not a mistake", () => {
    expect(getLinkProps("https://example.com", { allowedSchemes: [] }).state.navigable).toBe(false);
    // A site-relative path names no scheme, so no allow-list can judge it
    expect(getLinkProps("/search", { allowedSchemes: [] }).state.navigable).toBe(true);
  });

  it("refuses to attach defaults outside a module's bundle evaluation", () => {
    expect(() => setLinkDefaults({ allowedSchemes: ["https"] })).toThrow(
      "no module to attach these defaults to",
    );
  });
});

describe("the node a link resolved to", () => {
  it("hands back the node target, so a caller can read it without resolving it twice", () => {
    const node = jcrNode({ path: "/sites/test/home/news" });
    expect(getLinkProps(node).state.node).toBe(node);
  });

  it("reports no node for a URL target and for no target at all", () => {
    expect(getLinkProps("https://example.com").state.node).toBeUndefined();
    expect(getLinkProps(null).state.node).toBeUndefined();
  });

  it("hands back the reference a content node carried", () => {
    const target = jcrNode({ identifier: "u-target", path: "/sites/test/home/news" });
    const cta = jcrNode({ references: { "j:node": { uuid: "u-target", target } } });
    expect(resolveContentLink(cta, {}, { renderContext })?.state.node).toBe(target);
  });

  it("reports no node when the reference did not resolve", () => {
    const cta = jcrNode({ references: { "j:node": { uuid: "u-draft" } } });
    const link = resolveContentLink(cta, {}, { renderContext });
    expect(link?.state.navigable).toBe(false);
    expect(link?.state.node).toBeUndefined();
  });
});

describe("where a mixin-shaped link takes its label from", () => {
  const target = jcrNode({
    identifier: "u-target",
    path: "/sites/test/home/news",
    displayableName: "News",
  });
  const context = { renderContext };

  /** A CTA mixin on a card: the card's jcr:title is the heading, not the link label. */
  const card = jcrNode({
    strings: { "jcr:title": "Our latest work", "acme:ctaLabel": "See the projects" },
    references: { "j:node": { uuid: "u-target", target } },
  });

  it("takes the heading by default, which is the bug this option exists for", () => {
    expect(resolveContentLink(card, {}, context)?.state.label).toBe("Our latest work");
  });

  it("takes the property the mixin actually stores its label in", () => {
    expect(
      resolveContentLink(card, { labelProperties: ["acme:ctaLabel"] }, context)?.state.label,
    ).toBe("See the projects");
  });

  it("falls through to the target's own name when the named properties are empty", () => {
    expect(
      resolveContentLink(card, { labelProperties: ["acme:missing"] }, context)?.state.label,
    ).toBe("News");
    expect(resolveContentLink(card, { labelProperties: [] }, context)?.state.label).toBe("News");
  });

  it("skips the content node entirely on labelFrom: target", () => {
    expect(resolveContentLink(card, { labelFrom: "target" }, context)?.state.label).toBe("News");
  });

  it("lets labelFrom win over labelProperties, as its documentation says", () => {
    expect(
      resolveContentLink(card, { labelFrom: "target", labelProperties: ["acme:ctaLabel"] }, context)
        ?.state.label,
    ).toBe("News");
  });

  it("still lets an explicit label win over both", () => {
    expect(
      resolveContentLink(card, { label: "Read on", labelFrom: "target" }, context)?.state.label,
    ).toBe("Read on");
  });

  it("leaves the label of an external link empty when nothing on the node supplies one", () => {
    const external = jcrNode({ strings: { "j:url": "https://example.com" } });
    expect(resolveContentLink(external, { labelFrom: "target" }, context)?.state.label).toBe("");
  });
});
