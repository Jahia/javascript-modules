/**
 * Temporary: `ConfigHelper.isDevelopmentMode()` exists in the engine, but the typings it is
 * generated into (`target/types`) are only refreshed by a Maven build. This file adds it back so
 * that the library type-checks against a tree built without one.
 *
 * `.java-ts-bind/package.json` already whitelists `ConfigHelper.*`, so the next regeneration of
 * `target/types` makes this file redundant — **delete it then**. It is not shipped: `post-build.js`
 * copies only `globals.d.ts` and the generated Java types into `dist`.
 *
 * @see {@link https://github.com/Jahia/javascript-modules/issues/748}
 */
declare module "org.jahia.modules.javascript.modules.engine.js.server" {
  interface ConfigHelper {
    /** True on an instance started with `developmentMode` in `jahia.properties`. */
    isDevelopmentMode(): boolean;
  }
}
