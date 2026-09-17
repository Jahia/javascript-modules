/**
 * Temporary: `JCRNodeWrapper.getProvider()` and `JCRStoreProvider.isDefault()` exist in Jahia core
 * but were excluded from the generated typings by the java-ts-bind configuration. This file adds
 * back only what {@link buildImageUrl} needs to route a resize to the right channel.
 *
 * `.java-ts-bind/package.json` now includes `JCRStoreProvider` and whitelists both methods, so the
 * next regeneration of `target/types` makes this file redundant — **delete it then**. It is not
 * shipped: `post-build.js` copies only `globals.d.ts` and the generated Java types into `dist`.
 *
 * @see {@link https://github.com/Jahia/javascript-modules/issues/739}
 */
declare module "org.jahia.services.content" {
  interface JCRStoreProvider {
    /** True for the default provider, false for an external provider mount (a DAM). */
    isDefault(): boolean;
    /** The provider key, unique per mount. */
    getKey(): string;
  }

  interface JCRNodeWrapper {
    /** The provider this node is stored in. */
    getProvider(): JCRStoreProvider;
  }
}
