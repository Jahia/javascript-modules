# Shared Libraries

Files in this directory are meant to be bundled and shared with JavaScript modules running on the same instance of the engine.

Because the people at Facebook [haven't figured out how to write ES6 compliant code yet](https://github.com/facebook/react/issues/10021), we have to jump through some hoops to get this to work. Namely, we reexport React with both named exports and a default export.

All other ESM dependencies are bundled directly without the need for reexports. You can see the complete list in the [rollup.config.mjs](../../rollup.config.mjs) file.
