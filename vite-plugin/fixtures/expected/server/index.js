import { jsxs, jsx } from "react/jsx-runtime";
import { AddResources, buildModuleFileUrl, jahiaComponent, Island } from "@jahia/javascript-modules-library";
import "react";
const vite = "dist/assets/vite-DrFLeNov.png";
const Layout = ({ children }) => /* @__PURE__ */ jsxs("body", { children: [
  children,
  /* @__PURE__ */ jsx(AddResources, { type: "css", resources: buildModuleFileUrl("dist/assets/style.css") })
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
  return /* @__PURE__ */ jsx("pre", { className: classes.pre, children: "Hello World!" });
});
jahiaComponent(
  {
    componentType: "view",
    nodeType: "fixtures:foo"
  },
  () => /* @__PURE__ */ jsxs(Layout, { children: [
    /* @__PURE__ */ jsx("img", { src: buildModuleFileUrl(vite), alt: "Vite logo" }),
    /* @__PURE__ */ jsx(Island, { component: Foo })
  ] })
);
jahiaComponent(
  {
    componentType: "view",
    nodeType: "process:env"
  },
  () => /* @__PURE__ */ jsxs("h1", { children: [
    "Mode: ",
    "production"
  ] })
);
//# sourceMappingURL=index.js.map
