import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { JCRNodeWrapper } from "org.jahia.services.content";

// `buildNodeUrl` reaches into the Jahia render context, which only exists inside the engine. The
// mock reproduces the two channels it offers: `parameters` become a query string (the default
// provider, honoured by Media Optimization), and `args` go through node.getUrl(["w:600"]), which a
// DAM decorator turns into a signed, transformed URL.
vi.mock("../urlBuilder/urlBuilder.js", () => ({
  buildNodeUrl: (
    node: { url: string; getUrl: (params: string[]) => string },
    config?: { parameters?: Record<string, string>; args?: Record<string, string | number> },
  ) => {
    if (config?.args) {
      return node.getUrl(Object.entries(config.args).map(([key, value]) => `${key}:${value}`));
    }

    return config?.parameters ? `${node.url}?${new URLSearchParams(config.parameters)}` : node.url;
  },
  buildModuleFileUrl: (path: string) => `/modules/test${path}`,
}));

const { buildImageUrl } = await import("./buildImageUrl.js");
const { getImageProps, DEFAULT_BREAKPOINTS } = await import("./getImageProps.js");
const { readImageMeta } = await import("./imageMeta.js");

/** A JCR file node holding an image, with just the surface the image code touches. */
const imageNode = ({
  url = "/files/photo.jpg",
  path,
  mimeType = "image/jpeg",
  width,
  height,
  defaultProvider = true,
  thumbnails = ["thumbnail", "thumbnail2"],
  getUrl,
}: {
  url?: string;
  path?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  defaultProvider?: boolean;
  thumbnails?: string[];
  getUrl?: (params: string[]) => string;
} = {}) =>
  ({
    url,
    // A real node always reports a path; omitting it models the one that cannot be read
    getPath: () => {
      if (path === undefined) throw new Error("no path");
      return path;
    },
    getProvider: () => ({ isDefault: () => defaultProvider, getKey: () => "test" }),
    // A DAM decorator signs the transformed URL; the default provider discards these params
    getUrl: getUrl ?? ((params: string[]) => `${url}#signed(${params.join(",")})`),
    getThumbnailUrl: (name: string) => {
      if (!thumbnails.includes(name)) throw new Error(`no thumbnail ${name}`);
      return `${url}?t=${name}`;
    },
    getDisplayableName: () => "photo.jpg",
    getNode: (child: string) =>
      child === "jcr:content"
        ? { getPropertyAsString: (p: string) => (p === "jcr:mimeType" ? mimeType : "") }
        : null,
    getProperty: (property: string) => {
      const value = property === "j:width" ? width : property === "j:height" ? height : undefined;
      // A JCR node throws PathNotFoundException on a property it does not have
      if (value === undefined) throw new Error(`no such property: ${property}`);
      return { getLong: () => value };
    },
  }) as unknown as JCRNodeWrapper;

describe("readImageMeta", () => {
  it("reads the intrinsic dimensions of a raster image", () => {
    expect(readImageMeta(imageNode({ width: 2000, height: 1000 }))).toEqual({
      vector: false,
      intrinsicWidth: 2000,
      intrinsicHeight: 1000,
    });
  });

  it("flags a vector and does not look for dimensions", () => {
    expect(readImageMeta(imageNode({ mimeType: "image/svg+xml", width: 100 }))).toEqual({
      vector: true,
    });
  });

  it("tolerates missing dimensions and a missing mime type", () => {
    expect(readImageMeta(imageNode())).toEqual({
      vector: false,
      intrinsicWidth: undefined,
      intrinsicHeight: undefined,
    });
  });
});

describe("buildImageUrl", () => {
  it("returns the original when no size is requested", () => {
    const node = imageNode({ width: 2000 });
    expect(buildImageUrl(node)).toEqual({ url: "/files/photo.jpg", channel: "original" });
  });

  it("returns the original when the resize would be a no-op", () => {
    const node = imageNode({ width: 2000 });
    expect(buildImageUrl(node, { width: 2000 }).channel).toBe("original");
    // Clamped to the intrinsic width first, so an oversized request is also a no-op
    expect(buildImageUrl(node, { width: 4000 }).channel).toBe("original");
  });

  it("never resizes a vector", () => {
    const node = imageNode({ url: "/files/logo.svg", mimeType: "image/svg+xml" });
    expect(buildImageUrl(node, { width: 600 })).toEqual({
      url: "/files/logo.svg",
      channel: "original",
    });
  });

  it("prefers a pre-generated thumbnail, the only resize a plain instance performs", () => {
    const node = imageNode({ width: 2000 });
    expect(buildImageUrl(node, { width: 150 })).toEqual({
      url: "/files/photo.jpg?t=thumbnail",
      channel: "thumbnail",
      width: 150,
    });
  });

  it("falls back to query parameters for a width no thumbnail covers", () => {
    const node = imageNode({ width: 2000 });
    expect(buildImageUrl(node, { width: 600 })).toEqual({
      url: "/files/photo.jpg?w=600",
      channel: "query",
      width: 600,
    });
  });

  it("routes an external provider through node.getUrl, so its decorator signs the variant", () => {
    const node = imageNode({
      url: "https://dam.example/a.jpg",
      width: 4000,
      defaultProvider: false,
    });
    expect(buildImageUrl(node, { width: 600 })).toEqual({
      url: "https://dam.example/a.jpg#signed(w:600)",
      channel: "provider",
      width: 600,
    });
  });

  it("drops the axis that would be a no-op", () => {
    const node = imageNode({ width: 2000, height: 1000 });
    expect(buildImageUrl(node, { width: 600, height: 1000 }).url).toBe("/files/photo.jpg?w=600");
  });
});

describe("getImageProps", () => {
  it("requires a width for a constrained layout, and says why", () => {
    expect(() => getImageProps(imageNode({ width: 2000 }), { alt: "" })).toThrow(
      /layout "constrained" needs a width/,
    );
  });

  it("derives candidates and sizes for a fixed slot", () => {
    const props = getImageProps(imageNode({ width: 2000, height: 1000 }), {
      alt: "A terrace",
      layout: "fixed",
      width: 300,
    });
    // 300 and its 2x variant, so a retina screen gets a sharp file
    expect(props.srcSet).toBe("/files/photo.jpg?w=300 300w, /files/photo.jpg?w=600 600w");
    expect(props.sizes).toBe("300px");
    expect(props).toMatchObject({ src: "/files/photo.jpg?w=300", width: 2000, height: 1000 });
  });

  it("adds smaller candidates for a constrained slot that can shrink", () => {
    const props = getImageProps(imageNode({ width: 4000 }), {
      alt: "A terrace",
      width: 960,
    });
    expect(props.srcSet).toBe(
      "/files/photo.jpg?w=320 320w, /files/photo.jpg?w=640 640w, " +
        "/files/photo.jpg?w=960 960w, /files/photo.jpg?w=1920 1920w",
    );
    expect(props.sizes).toBe("(min-width: 960px) 960px, 100vw");
  });

  it("uses the breakpoint ladder for a full-width hero", () => {
    const props = getImageProps(imageNode({ width: 4000 }), {
      alt: "A terrace",
      layout: "full-width",
    });
    expect(props.sizes).toBe("100vw");
    for (const breakpoint of DEFAULT_BREAKPOINTS) {
      expect(props.srcSet).toContain(`${breakpoint}w`);
    }
  });

  it("keeps the original as a candidate only when it is close to the largest requested", () => {
    // 2000 <= 2 x 1280: a useful top candidate
    expect(
      getImageProps(imageNode({ width: 2000 }), { alt: "", layout: "fixed", width: 640 }).srcSet,
    ).toContain("/files/photo.jpg 2000w");
    // 8000 > 2 x 1280: serving the master into that slot would waste megabytes
    expect(
      getImageProps(imageNode({ width: 8000 }), { alt: "", layout: "fixed", width: 640 }).srcSet,
    ).not.toContain("8000w");
  });

  it("keeps the smallest width when a provider collapses several onto one rendition", () => {
    // A DAM serving fixed renditions: every request snaps up to 320 / 1024 / 2048
    const node = imageNode({
      url: "https://dam.example/a.jpg",
      width: 2048,
      defaultProvider: false,
      getUrl: (params) => {
        const requested = Number(params[0].split(":")[1]);
        const rendition = [320, 1024, 2048].find((size) => size >= requested) ?? 2048;
        return `https://dam.example/a.jpg#rendition(${rendition})`;
      },
    });
    const props = getImageProps(node, { alt: "", layout: "fixed", width: 600 });
    // 600 and 1200 both snap to the 1024 rendition: under-claim it as 600w so the browser climbs
    // to the next candidate instead of painting an upscaled image
    expect(props.srcSet).toBe(
      "https://dam.example/a.jpg#rendition(1024) 600w, " +
        "https://dam.example/a.jpg#rendition(2048) 1200w, " +
        // The 2048px original is within 2x of the largest request, so it earns a place too
        "https://dam.example/a.jpg 2048w",
    );
  });

  it("percent-encodes commas inside srcSet, which Jahia's rewriter splits on", () => {
    const node = imageNode({
      url: "https://cdn.example/image/upload/v1/a.jpg",
      width: 1200,
      defaultProvider: false,
      // A Cloudinary-style decorator puts comma-separated transformations in the path
      getUrl: (params) =>
        `https://cdn.example/image/upload/f_auto,${params[0].replace(":", "_")}/v1/a.jpg`,
    });
    const props = getImageProps(node, { alt: "", layout: "fixed", width: 600 });
    expect(props.srcSet).not.toMatch(/,\S/);
    expect(props.srcSet).toContain("f_auto%2Cw_600");
    // A single URL is unambiguous, so `src` keeps its real commas
    expect(props.src).toBe("https://cdn.example/image/upload/f_auto,w_600/v1/a.jpg");
  });

  it("serves one resolution-independent file for a vector, with no candidates", () => {
    const props = getImageProps(imageNode({ url: "/files/logo.svg", mimeType: "image/svg+xml" }), {
      alt: "Acme",
      layout: "fixed",
      width: 100,
    });
    expect(props).toEqual({
      src: "/files/logo.svg",
      alt: "Acme",
      width: undefined,
      height: undefined,
    });
  });

  it("collapses to a single candidate when the original is smaller than the slot", () => {
    const props = getImageProps(imageNode({ width: 200 }), {
      alt: "",
      layout: "fixed",
      width: 300,
    });
    // Every candidate clamps to 200, which is a no-op resize: one original URL, no srcSet
    expect(props.src).toBe("/files/photo.jpg");
    expect(props.srcSet).toBeUndefined();
  });

  it("takes explicit widths and sizes as an escape hatch", () => {
    const props = getImageProps(imageNode({ width: 2000 }), {
      alt: "",
      widths: [400, 800],
      sizes: "50vw",
    });
    expect(props.srcSet).toBe("/files/photo.jpg?w=400 400w, /files/photo.jpg?w=800 800w");
    expect(props.sizes).toBe("50vw");
  });

  it("trims the alt text and keeps an explicit empty one", () => {
    const node = imageNode({ width: 2000 });
    expect(getImageProps(node, { alt: "  A terrace  ", layout: "fixed", width: 300 }).alt).toBe(
      "A terrace",
    );
    expect(getImageProps(node, { alt: "", layout: "fixed", width: 300 }).alt).toBe("");
  });
});

describe("the ignored-resize warning", () => {
  /** The engine injects `server` as a global; a test provides only the part under test. */
  const stubDevelopmentMode = (developmentMode: boolean) => {
    Reflect.set(globalThis, "server", {
      config: { isDevelopmentMode: () => developmentMode },
    });
  };

  /**
   * The warning latches a module-scope flag — once per engine lifetime is the point of it — so each
   * test needs its own copy of the module rather than the one a previous test already silenced.
   */
  let freshImageProps: typeof getImageProps;
  beforeEach(async () => {
    vi.resetModules();
    ({ getImageProps: freshImageProps } = await import("./getImageProps.js"));
  });

  /** A slot of 600 on a 2000px original: candidates no thumbnail covers, so `?w=` carries them. */
  const slot = { alt: "", layout: "fixed", width: 600 } as const;

  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(globalThis, "server");
  });

  it("names the node and points at the guide", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    stubDevelopmentMode(true);

    freshImageProps(imageNode({ path: "/sites/test/files/hinted.jpg", width: 2000 }), slot);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("/sites/test/files/hinted.jpg");
    expect(warn.mock.calls[0][0]).toContain("8-images/README.md");
  });

  it("says nothing in production", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    stubDevelopmentMode(false);

    freshImageProps(imageNode({ path: "/sites/test/files/production.jpg", width: 2000 }), slot);

    expect(warn).not.toHaveBeenCalled();
  });

  it("says nothing when there is no server bridge to ask", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(() =>
      freshImageProps(imageNode({ path: "/sites/test/files/no-bridge.jpg", width: 2000 }), slot),
    ).not.toThrow();
    expect(warn).not.toHaveBeenCalled();
  });

  it("says nothing about the channels that do resize", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    stubDevelopmentMode(true);

    // A pre-generated thumbnail width: a real resize on any instance
    freshImageProps(imageNode({ path: "/sites/test/files/thumb.jpg", width: 2000 }), {
      alt: "",
      widths: [150],
    });
    // An external provider, whose decorator signs a transformed URL
    freshImageProps(
      imageNode({ path: "/sites/test/files/dam.jpg", width: 4000, defaultProvider: false }),
      slot,
    );
    // Nothing to resize: every candidate clamps to the smaller original
    freshImageProps(imageNode({ path: "/sites/test/files/small.jpg", width: 200 }), slot);
    // A vector needs no candidates at all
    freshImageProps(
      imageNode({ path: "/sites/test/files/logo.svg", mimeType: "image/svg+xml" }),
      slot,
    );

    expect(warn).not.toHaveBeenCalled();
  });

  it("warns once for the instance, not per image or per render", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    stubDevelopmentMode(true);

    const node = imageNode({ path: "/sites/test/files/repeated.jpg", width: 2000 });
    freshImageProps(node, slot);
    // Re-rendering the same image says nothing new
    freshImageProps(node, slot);
    // Neither does a different image: the instance, not the asset, is what ignores the parameters
    freshImageProps(imageNode({ path: "/sites/test/files/another.jpg", width: 2000 }), slot);

    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("still renders when the node cannot report its path", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    stubDevelopmentMode(true);

    expect(() => freshImageProps(imageNode({ width: 2000 }), slot)).not.toThrow();
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
