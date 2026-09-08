import { AddResources, Island, buildModuleFileUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import { jsx, jsxs } from "react/jsx-runtime";
import "react";
//#region src/vite.png
var vite_default = "dist/assets/vite-DrFLeNov.png";
//#endregion
//#region src/Layout.tsx
var Layout = ({ children }) => /* @__PURE__ */ jsxs("body", { children: [children, /* @__PURE__ */ jsx(AddResources, {
	type: "css",
	resources: buildModuleFileUrl("dist/assets/style.css")
})] });
var foo_module_default = { pre: "_pre_1cbxx_3" };
//#endregion
//#region src/foo.client.tsx
var foo_client_default = (function(v) {
	if ((typeof v === "function" || typeof v === "object" && v) && Object.isExtensible(v)) Object.defineProperties(v, {
		__filename: {
			value: "dist/client/foo.client.tsx",
			enumerable: false,
			configurable: true
		},
		__exportName: {
			value: "default",
			enumerable: false,
			configurable: true
		}
	});
	return v;
})(function Foo() {
	return /* @__PURE__ */ jsx("pre", {
		className: foo_module_default.pre,
		children: "Hello World!"
	});
});
//#endregion
//#region src/named.client.tsx
/** A client component exported by name, to check named exports carry hydration metadata. */
function Named() {
	return /* @__PURE__ */ jsx("pre", { children: "Named export!" });
}
(function(v) {
	if ((typeof v === "function" || typeof v === "object" && v) && Object.isExtensible(v)) Object.defineProperties(v, {
		__filename: {
			value: "dist/client/named.client.tsx",
			enumerable: false,
			configurable: true
		},
		__exportName: {
			value: "Named",
			enumerable: false,
			configurable: true
		}
	});
})(Named);
/** A second named export in the same file, tagged independently. */
var AlsoNamed = () => /* @__PURE__ */ jsx("pre", { children: "Also a named export!" });
(function(v) {
	if ((typeof v === "function" || typeof v === "object" && v) && Object.isExtensible(v)) Object.defineProperties(v, {
		__filename: {
			value: "dist/client/named.client.tsx",
			enumerable: false,
			configurable: true
		},
		__exportName: {
			value: "AlsoNamed",
			enumerable: false,
			configurable: true
		}
	});
})(AlsoNamed);
//#endregion
//#region src/foo.server.tsx
jahiaComponent({
	componentType: "view",
	nodeType: "fixtures:foo"
}, () => /* @__PURE__ */ jsxs(Layout, { children: [
	/* @__PURE__ */ jsx("img", {
		src: buildModuleFileUrl(vite_default),
		alt: "Vite logo"
	}),
	/* @__PURE__ */ jsx(Island, { component: foo_client_default }),
	/* @__PURE__ */ jsx(Island, { component: Named }),
	/* @__PURE__ */ jsx(Island, { component: AlsoNamed })
] }));
//#endregion
//#region src/process.env.server.tsx
jahiaComponent({
	componentType: "view",
	nodeType: "process:env"
}, () => /* @__PURE__ */ jsxs("h1", { children: ["Mode: ", "production"] }));
//#endregion
export {};

//# sourceMappingURL=index.js.map