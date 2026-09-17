import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { RenderContext } from "org.jahia.services.render";

// Matches a URL that already carries a scheme, or a protocol-relative one
const absoluteUrlRegExp = /^(?:[a-z+]+:)?\/\//i;

/**
 * How an absolute URL gets its scheme and host.
 *
 * - `true`: resolve it — the target site's server name when it declares one, the current request
 *   otherwise.
 * - A string: use that origin verbatim (`"https://www.example.com"`), for the cases resolution cannot
 *   know about (a reverse proxy, a preview host, a canonical domain).
 */
export type AbsoluteUrlOption = boolean | string;

/** Ports a URL does not need to spell out. */
const DEFAULT_PORTS: Record<string, number> = { http: 80, https: 443 };

/** The origin of the request being served, port included when it is not the scheme's default. */
const requestOrigin = (context: { renderContext?: RenderContext }): string | undefined => {
  const request = context.renderContext?.getRequest();
  if (!request) return undefined;

  const scheme = request.getScheme();
  const port = request.getServerPort();
  const authority =
    port && port !== DEFAULT_PORTS[scheme]
      ? `${request.getServerName()}:${port}`
      : request.getServerName();
  return `${scheme}://${authority}`;
};

/**
 * The origin declared by the site the node belongs to.
 *
 * Preferred over the request's own origin because a URL can point at _another_ site — a canonical
 * link, a JSON-LD reference, an `og:image` on a shared asset — and that site is reachable under its
 * own server name, not under the one this request happened to use. Core's
 * `JCRNodeWrapper.getAbsoluteUrl(request)` takes the request's, which is why it cannot be reused
 * here.
 *
 * A site with no server name configured reports `localhost`, which is a placeholder rather than an
 * answer. `https` is assumed: a server name is a public host, and a public host that is not served
 * over TLS is not a case worth generating URLs for.
 */
const siteOrigin = (node: JCRNodeWrapper): string | undefined => {
  try {
    const serverName = node.getResolveSite()?.getServerName();
    return serverName && serverName !== "localhost" ? `https://${serverName}` : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Prefixes a Jahia URL with an origin, so it can travel outside the page that produced it.
 *
 * @param url - A URL built by this module — usually root-relative.
 * @param node - The node the URL points at; its site supplies the server name.
 * @param absolute - Falsy to leave the URL alone, otherwise see {@link AbsoluteUrlOption}.
 * @param context - Supplies the request the origin falls back to.
 * @returns The absolute URL, or `url` untouched when `absolute` is falsy or it already is one.
 */
export function toAbsoluteUrl(
  url: string,
  node: JCRNodeWrapper,
  absolute: AbsoluteUrlOption | undefined,
  context: { renderContext?: RenderContext } = {},
): string {
  if (!absolute) return url;
  // An external provider often returns its own absolute URL already
  if (absoluteUrlRegExp.test(url)) return url;

  const origin =
    typeof absolute === "string"
      ? absolute.replace(/\/+$/, "")
      : (siteOrigin(node) ?? requestOrigin(context));

  if (!origin) {
    throw new Error(
      "Cannot build an absolute URL: the target site declares no server name, and there is no " +
        'request to borrow one from. Pass the origin explicitly, as absolute: "https://example.com".',
    );
  }

  return origin + url;
}
