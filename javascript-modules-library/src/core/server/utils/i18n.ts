import type { Locale } from "java.util";
import { useServerContext } from "../hooks/useServerContext.js";
import type { RenderContext } from "org.jahia.services.render";

/**
 * Returns the locales available on the site, as a record of language code (e.g. en_US) to locale
 * object.
 *
 * If not provided, the `renderContext` is taken from the current server context.
 */
export function getSiteLocales(
  { renderContext }: { renderContext: RenderContext } = useServerContext(),
): Record<string, Locale> {
  const locales = renderContext.isLiveMode()
    ? renderContext.getSite().getActiveLiveLanguagesAsLocales()
    : renderContext.getSite().getLanguagesAsLocales();

  return Object.fromEntries(locales.map((locale) => [locale.toString(), locale]));
}
