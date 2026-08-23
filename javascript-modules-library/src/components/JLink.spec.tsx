import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { RenderContext } from "org.jahia.services.render";
import { ServerContextProvider, type ServerContext } from "../hooks/useServerContext.js";

vi.mock("../utils/urlBuilder/urlBuilder.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../utils/urlBuilder/urlBuilder.js")>()),
  buildNodeUrl: (node: { getUrl: () => string | null }) => node.getUrl(),
}));

const { JLink } = await import("./JLink.js");
const { getLinkProps } = await import("../utils/link/getLinkProps.js");

/** A JCR node with just the surface the link code touches. */
const jcrNode = ({
  identifier = "u-1",
  path = "/sites/test/home",
  url,
  displayableName = "Home",
  strings = {},
}: {
  identifier?: string;
  path?: string;
  url?: string | null;
  displayableName?: string;
  strings?: Record<string, string>;
} = {}) =>
  ({
    getIdentifier: () => identifier,
    getPath: () => path,
    getDisplayableName: () => displayableName,
    getUrl: () => (url === undefined ? `${path}.html` : url),
    hasProperty: (property: string) => property in strings,
    getPropertyAsString: (property: string) => strings[property] ?? null,
    getProperty: (property: string) => {
      throw new Error(`no such property: ${property}`);
    },
    hasTranslations: () => false,
    getExistingLocales: () => [],
  }) as unknown as JCRNodeWrapper;

const renderContext = {} as RenderContext;
const mainNode = jcrNode({ identifier: "u-home", path: "/sites/test/home" });

/** Renders inside the server context the component reads, the way the engine provides it. */
const render = (element: ReactElement, context: Partial<ServerContext> = {}) =>
  renderToStaticMarkup(
    <ServerContextProvider {...({ renderContext, mainNode, ...context } as ServerContext)}>
      {element}
    </ServerContextProvider>,
  );

beforeEach(() => {
  Reflect.set(globalThis, "server", { render: { addCacheDependency: vi.fn() } });
});

afterEach(() => {
  vi.clearAllMocks();
  Reflect.deleteProperty(globalThis, "server");
});

describe("the props JLink puts on the DOM", () => {
  it("leaks no link state onto the anchor, whichever shape produced it", () => {
    const node = jcrNode({ identifier: "u-home", displayableName: "Home" });
    // Every key of the state object, read off the real thing so a field added later is covered
    const stateKeys = Object.keys(getLinkProps(node, {}, { mainNode }).state);
    expect(stateKeys).not.toHaveLength(0);

    const markups = [
      render(<JLink node={node} />),
      render(<JLink node={jcrNode({ identifier: "u-other", path: "/sites/test/other" })} />),
      render(<JLink href="https://example.com">Partner</JLink>),
      render(<JLink content={jcrNode({ strings: { "j:url": "https://example.com" } })} />),
    ];

    for (const markup of markups) {
      for (const key of stateKeys) {
        // An attribute React rendered would appear lower-cased, and always followed by "="
        expect(markup.toLowerCase()).not.toContain(`${key.toLowerCase()}=`);
      }
    }
  });

  it("turns the current-page state into aria-current, and nothing else", () => {
    const onThisPage = render(<JLink node={jcrNode({ identifier: "u-home" })}>Home</JLink>);
    expect(onThisPage).toBe('<a href="/sites/test/home.html" aria-current="page">Home</a>');

    const elsewhere = render(
      <JLink node={jcrNode({ identifier: "u-other", path: "/sites/test/other" })}>Other</JLink>,
    );
    expect(elsewhere).toBe('<a href="/sites/test/other.html">Other</a>');
  });

  it("passes every other anchor attribute through untouched", () => {
    const markup = render(
      <JLink
        href="/files/report.pdf"
        className="cta"
        download=""
        hrefLang="en"
        data-analytics="cta-hero"
      >
        Report
      </JLink>,
    );
    expect(markup).toBe(
      '<a href="/files/report.pdf" class="cta" download="" hrefLang="en" data-analytics="cta-hero">Report</a>',
    );
  });
});

describe("a link that is not navigable", () => {
  const unresolved = jcrNode({ url: null, displayableName: "Coming soon" });

  it("renders the children without an anchor rather than an anchor without an href", () => {
    const markup = render(<JLink node={unresolved}>Read the story</JLink>);
    expect(markup).toBe("Read the story");
    expect(markup).not.toContain("<a");
  });

  it("renders nothing when the caller asks for nothing", () => {
    expect(render(<JLink node={unresolved} whenUnresolved="none" />)).toBe("");
  });

  it("falls back to the derived label when the caller renders no children", () => {
    expect(render(<JLink node={unresolved} />)).toBe("Coming soon");
  });

  it("covers a content node whose discriminator says there is no link", () => {
    const none = jcrNode({ strings: { "ctaType": "none", "j:url": "https://example.com" } });
    expect(
      render(
        <JLink content={none} typeProperty="ctaType">
          Nothing to see
        </JLink>,
      ),
    ).toBe("Nothing to see");
    // Under the default discriminator name nothing says so, and the link is rendered
    expect(render(<JLink content={none}>Partner</JLink>)).toBe(
      '<a href="https://example.com">Partner</a>',
    );
  });

  it("drops the anchor attributes with it", () => {
    const markup = render(
      <JLink node={unresolved} target="_blank" title="Read more" className="cta">
        Later
      </JLink>,
    );
    expect(markup).toBe("Later");
  });
});

describe("attributes the component's own props cannot express", () => {
  const node = jcrNode({ identifier: "u-other", path: "/sites/test/other" });

  it("spreads a record onto the anchor", () => {
    const markup = render(
      <JLink node={node} attributes={{ "data-element-type": "cta", "data-index": 3 }}>
        Other
      </JLink>,
    );
    expect(markup).toBe(
      '<a href="/sites/test/other.html" data-element-type="cta" data-index="3">Other</a>',
    );
  });

  it("hands the resolved link to the function form, href and label together", () => {
    const markup = render(
      <JLink
        node={jcrNode({ identifier: "u-home", displayableName: "Home" })}
        attributes={({ anchor, state }) => ({
          "data-element-url": anchor.href,
          "data-element-text": state.label,
          "data-element-current": state.isCurrent,
        })}
      />,
    );
    expect(markup).toBe(
      '<a href="/sites/test/home.html" aria-current="page" data-element-url="/sites/test/home.html"' +
        ' data-element-text="Home" data-element-current="true">Home</a>',
    );
  });

  it("drops the keys whose value is undefined, rather than rendering them empty", () => {
    const markup = render(
      <JLink node={node} attributes={{ "data-set": "yes", "data-unset": undefined }}>
        Other
      </JLink>,
    );
    expect(markup).toBe('<a href="/sites/test/other.html" data-set="yes">Other</a>');
  });

  it("wins over an anchor attribute of the same name, being spread last", () => {
    const markup = render(
      <JLink node={node} className="base" attributes={{ className: "override" }}>
        Other
      </JLink>,
    );
    expect(markup).toBe('<a href="/sites/test/other.html" class="override">Other</a>');
  });

  it("is not called at all when the link is not navigable", () => {
    const attributes = vi.fn(() => ({ "data-x": "1" }));
    expect(
      render(
        <JLink node={jcrNode({ url: null })} attributes={attributes}>
          Later
        </JLink>,
      ),
    ).toBe("Later");
    expect(attributes).not.toHaveBeenCalled();
  });
});

describe("asChild", () => {
  const node = jcrNode({ identifier: "u-other", path: "/sites/test/other" });
  /** A design system's call to action: not a bare anchor, and the reason asChild exists. */
  const CTA = ({ variant, ...rest }: { variant: string } & Record<string, unknown>) => (
    <a {...rest} className={`cta cta--${variant}`} />
  );

  it("hands the anchor attributes to the element the caller rendered", () => {
    const markup = render(
      <JLink node={node} asChild>
        <CTA variant="primary">Read more</CTA>
      </JLink>,
    );
    expect(markup).toBe('<a href="/sites/test/other.html" class="cta cta--primary">Read more</a>');
  });

  it("carries aria-current and the extra attributes through the child too", () => {
    const markup = render(
      <JLink
        node={jcrNode({ identifier: "u-home" })}
        asChild
        attributes={({ anchor }) => ({ "data-element-url": anchor.href })}
      >
        <CTA variant="ghost">Home</CTA>
      </JLink>,
    );
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain('data-element-url="/sites/test/home.html"');
  });

  it("still renders the child, without a link, when the target does not resolve", () => {
    const markup = render(
      <JLink node={jcrNode({ url: null })} asChild>
        <CTA variant="primary">Coming soon</CTA>
      </JLink>,
    );
    expect(markup).toBe('<a class="cta cta--primary">Coming soon</a>');
    expect(markup).not.toContain("href");
  });

  it("renders nothing when the caller asks for nothing", () => {
    const markup = render(
      <JLink node={jcrNode({ url: null })} asChild whenUnresolved="none">
        <CTA variant="primary">Coming soon</CTA>
      </JLink>,
    );
    expect(markup).toBe("");
  });

  it("says what is wrong when it is given anything but one element", () => {
    for (const children of [
      undefined,
      "just text",
      [<CTA key="a" variant="a" />, <CTA key="b" variant="b" />],
    ]) {
      expect(() =>
        render(
          <JLink node={node} asChild>
            {children}
          </JLink>,
        ),
      ).toThrow("asChild renders the child as the link");
    }
  });
});

describe("the anchor attributes JLink accepts", () => {
  it("still passes through the ones its own props do not claim", () => {
    const markup = render(
      <JLink href="/files/report.pdf" media="print" referrerPolicy="no-referrer">
        Report
      </JLink>,
    );
    expect(markup).toContain('media="print"');
    expect(markup).toContain('referrerPolicy="no-referrer"');
  });

  it("keeps every prop it consumes off the DOM, derived from the props themselves", () => {
    const markup = render(
      <JLink
        content={jcrNode({ strings: { "j:url": "https://example.com" } })}
        typeProperty="ctaType"
        noneValue="noLink"
        referenceProperties={[]}
        urlProperty="j:url"
        labelProperties={["acme:label"]}
        labelFrom="content"
        allowedSchemes={["https"]}
        whenUnresolved="children"
      >
        Partner
      </JLink>,
    );
    expect(markup).toBe('<a href="https://example.com">Partner</a>');
  });
});
