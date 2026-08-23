/**
 * True on a development instance.
 *
 * Every part of this call can be missing — the whole `server` bridge outside the engine, the method
 * on an engine older than it — and a diagnostic that cannot tell must stay quiet rather than fail.
 */
const isDevelopmentMode = (): boolean => {
  try {
    return server.config.isDevelopmentMode();
  } catch {
    return false;
  }
};

/**
 * What has already been said. A diagnostic describes a mistake in the code, not an event, so the
 * second occurrence of the same key carries no information the first did not.
 */
const reported = new Set<string>();

/**
 * Prints one line per key, on a development instance only — a production instance pays nothing.
 *
 * @param key - What makes two occurrences the same mistake.
 * @param message - Built only when it will actually be printed.
 */
const warnOnce = (key: string, message: () => string): void => {
  if (!isDevelopmentMode() || reported.has(key)) return;

  reported.add(key);
  console.warn(message());
};

/** Where the messages send the reader for the long version. */
const GUIDE = "docs/2-guides/9-links/README.md";

/**
 * Warns, once per scheme, that `allowedSchemes` was asked to allow a scheme the library refuses.
 *
 * The option narrows the built-in list and cannot widen it, so the request is dropped rather than
 * honoured. Saying nothing would leave a project believing its `s3:` links are rendered when they
 * are silently not navigable — a wrong result that looks exactly like missing content.
 *
 * @param schemes - The requested schemes that are not in the built-in list.
 */
export function warnUnknownAllowedSchemes(schemes: readonly string[]): void {
  for (const scheme of schemes) {
    warnOnce(
      `unknown-allowed-scheme:${scheme}`,
      () =>
        `getLinkProps: allowedSchemes asks for "${scheme}", which the library does not allow. ` +
        `The option narrows the built-in list — http, https, mailto, tel, ftp — it does not ` +
        `extend it, so "${scheme}" links stay not navigable. ` +
        `See ${GUIDE}, "URLs you did not build".`,
    );
  }
}
