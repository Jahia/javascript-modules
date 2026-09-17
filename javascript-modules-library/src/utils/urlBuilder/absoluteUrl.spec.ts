import { describe, expect, it } from "vitest";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { RenderContext } from "org.jahia.services.render";
import { toAbsoluteUrl } from "./absoluteUrl.js";

/** A node, seen only through the site it resolves to. */
const nodeOnSite = (serverName?: string | Error) =>
  ({
    getResolveSite: () => {
      if (serverName instanceof Error) throw serverName;
      return { getServerName: () => serverName };
    },
  }) as unknown as JCRNodeWrapper;

/** A render context, seen only through the request an origin can be read from. */
const requestFrom = (scheme: string, host: string, port: number) => ({
  renderContext: {
    getRequest: () => ({
      getScheme: () => scheme,
      getServerName: () => host,
      getServerPort: () => port,
    }),
  } as unknown as RenderContext,
});

describe("toAbsoluteUrl", () => {
  it("leaves the URL alone when nothing was asked for", () => {
    expect(toAbsoluteUrl("/sites/a/home.html", nodeOnSite("www.example.com"), false)).toBe(
      "/sites/a/home.html",
    );
    expect(toAbsoluteUrl("/sites/a/home.html", nodeOnSite("www.example.com"), undefined)).toBe(
      "/sites/a/home.html",
    );
  });

  it("names the server of the site the node belongs to", () => {
    expect(
      toAbsoluteUrl(
        "/sites/a/home.html",
        nodeOnSite("www.example.com"),
        true,
        requestFrom("http", "localhost", 8080),
      ),
    ).toBe("https://www.example.com/sites/a/home.html");
  });

  it("falls back to the request for a site that declares no server name", () => {
    for (const serverName of [undefined, "", "localhost"]) {
      expect(
        toAbsoluteUrl(
          "/sites/a/home.html",
          nodeOnSite(serverName),
          true,
          requestFrom("http", "localhost", 8080),
        ),
      ).toBe("http://localhost:8080/sites/a/home.html");
    }
  });

  it("leaves out a port that is the scheme's default", () => {
    expect(
      toAbsoluteUrl("/a.html", nodeOnSite(), true, requestFrom("https", "example.com", 443)),
    ).toBe("https://example.com/a.html");
  });

  it("uses an origin the caller names, trailing slash and all", () => {
    expect(toAbsoluteUrl("/a.html", nodeOnSite("www.example.com"), "https://cdn.acme.com/")).toBe(
      "https://cdn.acme.com/a.html",
    );
  });

  it("leaves a URL that already carries a host alone", () => {
    expect(toAbsoluteUrl("https://dam.example/a.jpg", nodeOnSite("www.example.com"), true)).toBe(
      "https://dam.example/a.jpg",
    );
    expect(toAbsoluteUrl("//dam.example/a.jpg", nodeOnSite("www.example.com"), true)).toBe(
      "//dam.example/a.jpg",
    );
  });

  it("survives a node whose site cannot be resolved", () => {
    expect(
      toAbsoluteUrl(
        "/a.html",
        nodeOnSite(new Error("no site")),
        true,
        requestFrom("http", "h", 80),
      ),
    ).toBe("http://h/a.html");
  });

  it("refuses to invent an origin, and says how to supply one", () => {
    expect(() => toAbsoluteUrl("/a.html", nodeOnSite(), true)).toThrow(
      /Pass the origin explicitly/,
    );
  });
});
