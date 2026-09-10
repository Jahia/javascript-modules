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
