import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { JCRNodeWrapper } from "org.jahia.services.content";

// `JImage` is a plain function of its props: rendering it through React would only add a tree to
// walk back down. The one hook it calls is the server context, which outside the engine is ours.
const serverContext = () => ({
  bundleKey: "test-module",
  renderContext: {
    getRequest: () => ({ getContextPath: () => "" }),
    getResponse: () => ({ encodeURL: (url: string) => url }),
    getURLGenerator: () => ({ getCurrentModule: () => "/modules/test-module" }),
  },
});
vi.mock("../hooks/useServerContext.js", () => ({ useServerContext: serverContext }));
vi.mock("../hooks/useServerContext", () => ({ useServerContext: serverContext }));

// A render context means a cache dependency, which the engine's `server` bridge registers
Reflect.set(globalThis, "server", { render: { addCacheDependency: () => {} } });

const { JImage } = await import("./JImage.js");

/** A JCR file node holding an image, with just the surface the image code touches. */
const imageNode = ({
  url = "/files/photo.jpg",
  width = 4000,
  height = 2000,
  thumbnails = ["thumbnail", "thumbnail2"],
}: { url?: string; width?: number; height?: number; thumbnails?: string[] } = {}) =>
  ({
    getPath: () => "/sites/test/files/photo.jpg",
    getProvider: () => ({ isDefault: () => true }),
    getResolveSite: () => ({ getServerName: () => "www.example.com" }),
    getUrl: () => url,
    getThumbnailUrl: (name: string) => {
      if (!thumbnails.includes(name)) throw new Error(`no thumbnail ${name}`);
      return `${url}?t=${name}`;
    },
    getNode: (child: string) =>
      child === "jcr:content" ? { getPropertyAsString: () => "image/jpeg" } : null,
    getProperty: (property: string) => {
      const value = property === "j:width" ? width : property === "j:height" ? height : undefined;
      if (value === undefined) throw new Error(`no such property: ${property}`);
      return { getLong: () => value };
    },
  }) as unknown as JCRNodeWrapper;

/** The attributes the component would put on the `<img>`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const attributesOf = (element: ReturnType<typeof JImage>): Record<string, any> =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (element as any).props;

describe("attribute pass-through", () => {
  it("forwards an <img> attribute the component has no opinion about", () => {
    const props = attributesOf(
      JImage({
        node: imageNode(),
        alt: "A terrace",
        slotWidth: 600,
        id: "cover",
        className: "cover",
        decoding: "async",
        referrerPolicy: "no-referrer",
      }),
    );
    expect(props).toMatchObject({
      id: "cover",
      className: "cover",
      decoding: "async",
      referrerPolicy: "no-referrer",
    });
  });

  it("emits the height attribute, which a caller may need as the box itself", () => {
    const props = attributesOf(
      JImage({ node: imageNode(), alt: "", slotWidth: 48, width: 48, height: 48 }),
    );
    expect(props).toMatchObject({ width: 48, height: 48 });
  });

  it("reserves space from the intrinsic pair when the caller writes neither", () => {
    const props = attributesOf(JImage({ node: imageNode(), alt: "", slotWidth: 600 }));
    expect(props).toMatchObject({ width: 4000, height: 2000, loading: "lazy" });
  });

  it("refuses half a box, and names the prop the caller probably meant", () => {
    // TypeScript rejects this spelling; the throw catches the JavaScript caller and the spread
    // @ts-expect-error `width` and `height` are required together
    expect(() => JImage({ node: imageNode(), alt: "", slotWidth: 600, width: 48 })).toThrow(
      /pass both or neither.*slotWidth/s,
    );
  });

  it("takes the caller's box over the intrinsic one", () => {
    const props = attributesOf(
      JImage({ node: imageNode(), alt: "", slotWidth: 600, width: 48, height: 24 }),
    );
    expect(props).toMatchObject({ width: 48, height: 24, loading: "lazy" });
  });
});

describe("the attributes map", () => {
  it("spreads a record onto the element", () => {
    const props = attributesOf(
      JImage({
        node: imageNode(),
        alt: "",
        slotWidth: 600,
        attributes: { "data-testid": "cover", "itemProp": "image" },
      }),
    );
    expect(props).toMatchObject({ "data-testid": "cover", "itemProp": "image" });
  });

  it("hands the resolved image to the function form", () => {
    const props = attributesOf(
      JImage({
        node: imageNode(),
        alt: "",
        slotWidth: 600,
        attributes: ({ src, width }) => ({ "data-src": src, "data-width": width }),
      }),
    );
    // The resolved image, not the props the caller wrote: `src` is the smallest candidate and
    // `width` the intrinsic one
    expect(props["data-src"]).toBe("/files/photo.jpg?w=320");
    expect(props["data-width"]).toBe(4000);
  });

  it("is applied last, so it can override anything the component computed", () => {
    const props = attributesOf(
      JImage({ node: imageNode(), alt: "", slotWidth: 600, attributes: { loading: "eager" } }),
    );
    expect(props.loading).toBe("eager");
  });
});

describe("preload", () => {
  it("loads the image eagerly and at high priority", () => {
    const props = attributesOf(
      JImage({ node: imageNode(), alt: "", layout: "full-width", preload: true }),
    );
    expect(props).toMatchObject({ loading: "eager", fetchPriority: "high" });
  });
});

describe('sizes="auto"', () => {
  it("loads lazily, because that is the only mode a browser reads it in", () => {
    const props = attributesOf(
      JImage({ node: imageNode(), alt: "", layout: "fill", sizes: "auto" }),
    );
    expect(props).toMatchObject({ sizes: "auto", loading: "lazy" });
  });

  it("gives way to preload, which a shared wrapper's default cannot argue with", () => {
    const props = attributesOf(
      JImage({ node: imageNode(), alt: "", layout: "fluid", sizes: "auto", preload: true }),
    );
    // Nothing in the markup describes a fluid slot, so the safe answer is all that is left
    expect(props.sizes).toBe("100vw");
    expect(props).toMatchObject({ loading: "eager", fetchPriority: "high" });
  });

  it("falls back to the sizes the layout derives, not to the browser default", () => {
    const props = attributesOf(
      JImage({ node: imageNode(), alt: "", slotWidth: 600, sizes: "auto", loading: "eager" }),
    );
    expect(props.sizes).toBe("(min-width: 600px) 600px, 100vw");
    expect(props.loading).toBe("eager");
  });
});

describe("the development warnings", () => {
  /** The engine injects `server` as a global; a test provides only the parts under test. */
  const stubDevelopmentMode = (developmentMode: boolean) => {
    Reflect.set(globalThis, "server", {
      render: { addCacheDependency: () => {} },
      config: { isDevelopmentMode: () => developmentMode },
    });
  };

  /** Each warning is printed once per engine lifetime, so each test needs its own module copy. */
  let freshJImage: typeof JImage;
  beforeEach(async () => {
    vi.resetModules();
    ({ JImage: freshJImage } = await import("./JImage.js"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.set(globalThis, "server", { render: { addCacheDependency: () => {} } });
  });

  /** The `?w=` candidates warn on this instance too, so each test reads only its own message. */
  const autoSizesMessages = (warn: { mock: { calls: unknown[][] } }): string[] =>
    warn.mock.calls.map(([message]) => String(message)).filter((m) => m.includes('sizes="auto"'));

  it('reports the image that asked for both sizes="auto" and an eager load', () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    stubDevelopmentMode(true);

    freshJImage({ node: imageNode(), alt: "", layout: "fluid", sizes: "auto", preload: true });

    const [message, ...rest] = autoSizesMessages(warn);
    expect(rest).toHaveLength(0);
    expect(message).toContain("/sites/test/files/photo.jpg");
    expect(message).toContain('sizes="100vw"');
  });

  it("says nothing in production, where the page still renders", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    stubDevelopmentMode(false);

    const props = attributesOf(
      freshJImage({ node: imageNode(), alt: "", layout: "fluid", sizes: "auto", preload: true }),
    );

    expect(warn).not.toHaveBeenCalled();
    expect(props.sizes).toBe("100vw");
  });

  it("says nothing when the two never met", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    stubDevelopmentMode(true);

    freshJImage({ node: imageNode(), alt: "", layout: "fluid", sizes: "auto" });
    freshJImage({ node: imageNode(), alt: "", layout: "full-width", preload: true });

    expect(autoSizesMessages(warn)).toHaveLength(0);
  });
});

describe('the "fill" layout', () => {
  it("positions the image over its parent, which markup cannot express", () => {
    const props = attributesOf(
      JImage({ node: imageNode(), alt: "", layout: "fill", sizes: "50vw" }),
    );
    expect(props.style).toMatchObject({ position: "absolute", inset: 0, width: "100%" });
    expect(props.width).toBeUndefined();
  });

  it("lets a caller's style win over the positioning it suggests", () => {
    const props = attributesOf(
      JImage({
        node: imageNode(),
        alt: "",
        layout: "fill",
        sizes: "50vw",
        style: { position: "fixed", objectFit: "cover" },
      }),
    );
    expect(props.style).toMatchObject({ position: "fixed", objectFit: "cover" });
  });

  it("loads lazily on the strength of the parent's box", () => {
    const props = attributesOf(
      JImage({ node: imageNode(), alt: "", layout: "fill", sizes: "50vw" }),
    );
    expect(props.loading).toBe("lazy");
  });
});

describe("placeholder", () => {
  it('paints the smallest Jahia thumbnail under a "blur" image', () => {
    const props = attributesOf(
      JImage({ node: imageNode(), alt: "", slotWidth: 600, placeholder: "blur" }),
    );
    expect(props.style).toMatchObject({
      backgroundImage: 'url("/files/photo.jpg?t=thumbnail")',
      backgroundSize: "cover",
    });
  });

  it("prefers a data URI the caller supplied", () => {
    const props = attributesOf(
      JImage({
        node: imageNode(),
        alt: "",
        slotWidth: 600,
        placeholder: "blur",
        blurDataURL: "data:image/png;base64,AAAA",
      }),
    );
    expect(props.style.backgroundImage).toBe('url("data:image/png;base64,AAAA")');
  });

  it("takes a data URI as the placeholder value itself", () => {
    const props = attributesOf(
      JImage({
        node: imageNode(),
        alt: "",
        slotWidth: 600,
        placeholder: "data:image/gif;base64,BBBB",
      }),
    );
    expect(props.style.backgroundImage).toBe('url("data:image/gif;base64,BBBB")');
  });

  it("paints nothing when Jahia generated no thumbnail", () => {
    const props = attributesOf(
      JImage({
        node: imageNode({ thumbnails: [] }),
        alt: "",
        slotWidth: 600,
        placeholder: "blur",
      }),
    );
    expect(props.style).toBeUndefined();
  });

  it("leaves the style alone by default", () => {
    const props = attributesOf(JImage({ node: imageNode(), alt: "", slotWidth: 600 }));
    expect(props.style).toBeUndefined();
  });
});

describe('the "fluid" layout', () => {
  it("carries no CSS of its own: it is an ordinary image in the normal flow", () => {
    const props = attributesOf(
      JImage({ node: imageNode(), alt: "", layout: "fluid", sizes: "auto" }),
    );
    expect(props.style).toBeUndefined();
    // Unlike `fill`, the intrinsic pair survives, and it is what reserves the space
    expect(props).toMatchObject({ width: 4000, height: 2000, loading: "lazy" });
  });
});

describe("a missing node", () => {
  it("renders the module asset offered as a fallback", () => {
    const props = attributesOf(JImage({ alt: "Nothing yet", fallback: "img/placeholder.jpg" }));
    expect(props.src).toBe("/modules/test-module/img/placeholder.jpg");
  });

  it("renders nothing at all when there is no fallback either", () => {
    expect(JImage({ alt: "" })).toBeNull();
  });
});
