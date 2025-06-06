(function(jsxRuntime, javascriptModulesLibrary) {
  "use strict";
  const vite = "dist/assets/vite-DrFLeNov.png";
  const Layout = ({ children }) => /* @__PURE__ */ jsxRuntime.jsxs("body", { children: [
    children,
    /* @__PURE__ */ jsxRuntime.jsx(javascriptModulesLibrary.AddResources, { type: "css", resources: javascriptModulesLibrary.buildModuleFileUrl("dist/assets/style.css") })
  ] });
  const pre = "_pre_1cbxx_3";
  const classes = {
    pre
  };
  const Foo = function(v) {
    if (typeof v === "function" || typeof v === "object" && v)
      Object.defineProperty(v, "__filename", {
        value: "dist/client/foo.client.tsx",
        enumerable: false
      });
    return v;
  }(function Foo2() {
    return /* @__PURE__ */ jsxRuntime.jsx("pre", { className: classes.pre, children: "Hello World!" });
  });
  javascriptModulesLibrary.jahiaComponent(
    {
      componentType: "view",
      nodeType: "fixtures:foo"
    },
    () => /* @__PURE__ */ jsxRuntime.jsxs(Layout, { children: [
      /* @__PURE__ */ jsxRuntime.jsx("img", { src: javascriptModulesLibrary.buildModuleFileUrl(vite), alt: "Vite logo" }),
      /* @__PURE__ */ jsxRuntime.jsx(javascriptModulesLibrary.HydrateInBrowser, { child: Foo })
    ] })
  );
  javascriptModulesLibrary.jahiaComponent(
    {
      componentType: "view",
      nodeType: "process:env"
    },
    () => /* @__PURE__ */ jsxRuntime.jsxs("h1", { children: [
      "Mode: ",
      "production"
    ] })
  );
})(javascriptModulesLibraryBuilder.getSharedLibrary("react/jsx-runtime"), javascriptModulesLibraryBuilder.getSharedLibrary("@jahia/javascript-modules-library"));
//# sourceMappingURL=index.js.map
