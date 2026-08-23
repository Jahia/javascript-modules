import { describe, expect, it } from "vitest";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { RenderContext, Resource } from "org.jahia.services.render";
import { appendParameters, buildNodeUrl } from "./urlBuilder.js";

/** A node, seen only through the path and URL the builder reads. */
const jcrNode = (path = "/sites/test/home", url = "/cms/render/live/en/sites/test/home.html") =>
  ({
    getPath: () => path,
    getUrl: () => url,
    getResolveSite: () => ({ getServerName: () => undefined }),
  }) as unknown as JCRNodeWrapper;

/** The two context objects `buildNodeUrl` reads, with no context path and no URL encoding. */
const context = (mode?: string, locale = "en") => ({
  renderContext: {
    getMode: () => mode,
    getRequest: () => ({ getContextPath: () => "" }),
    getResponse: () => ({ encodeURL: (url: string) => url }),
  } as unknown as RenderContext,
  currentResource: {
    getLocale: () => ({ toString: () => locale }),
    getTemplateType: () => "html",
  } as unknown as Resource,
});

describe("appendParameters", () => {
  it("keeps the query string ahead of the fragment", () => {
    expect(appendParameters("/page.html#main", { a: "b" })).toBe("/page.html?a=b#main");
    expect(appendParameters("/page.html?x=1#main", { a: "b" })).toBe("/page.html?x=1&a=b#main");
  });

  it("returns the URL untouched when there is nothing to append", () => {
    expect(appendParameters("/page.html#main", {})).toBe("/page.html#main");
  });
});

describe("the servlet path of the manual branch", () => {
  it("points edit mode at the servlet that actually renders the page", () => {
    // /cms/edit/ redirects to the jContent UI; only an <a href> survives it, because EditModeFilter
    // substitutes the two on its way out. Everything else — an island payload, a data-* attribute —
    // carries the URL as built.
    expect(buildNodeUrl(jcrNode(), { mode: "edit" }, context("edit"))).toBe(
      "/cms/editframe/default/en/sites/test/home.html",
    );
    expect(buildNodeUrl(jcrNode(), { language: "de" }, context("edit"))).toBe(
      "/cms/editframe/default/de/sites/test/home.html",
    );
  });

  it("leaves the other two modes where they were", () => {
    expect(buildNodeUrl(jcrNode(), { mode: "preview" }, context("preview"))).toBe(
      "/cms/render/default/en/sites/test/home.html",
    );
    expect(buildNodeUrl(jcrNode(), { mode: "live" }, context("live"))).toBe(
      "/cms/render/live/en/sites/test/home.html",
    );
  });

  it("still asks the node itself when no mode, language or extension is named", () => {
    expect(buildNodeUrl(jcrNode(), {}, context("edit"))).toBe(
      "/cms/render/live/en/sites/test/home.html",
    );
  });
});
