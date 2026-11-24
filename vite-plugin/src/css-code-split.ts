import { createFilter } from "@rollup/pluginutils";
import MagicString from "magic-string";
import type { Plugin } from "vite";

const LIBRARY = "@jahia/javascript-modules-library";
const VIEW_SOURCE = "jahia-view-css:";
const VIEW_PREFIX = "\0" + VIEW_SOURCE;
const PLACEHOLDER_RE = /"__JAHIA_CSS__([\da-f]+)__"/g;
// Vite's CSS_LANGS_RE, without queries
const CSS_RE = /\.(css|less|sass|scss|styl|stylus|pcss|postcss|sss)$/;
// Vite processes a `?transform-only` stylesheet but leaves it out of the chunk CSS
const TRANSFORM_ONLY = "?transform-only";

const hex = (s: string) => Buffer.from(s).toString("hex");

/**
 * Emits one stylesheet per CSS source in the SSR build, and makes each view of a server file add
 * the stylesheets it imports, directly or not, with `<AddResources type="css">`.
 *
 * It replaces `assets/style.css`, which is no longer emitted.
 */
export function cssCodeSplit(root: string, glob: string): Plugin {
  const isServerFile = createFilter(glob, null, { resolve: root });

  return {
    name: "@jahia/vite-plugin:css-code-split",
    // Must run before Vite's resolver, and before the renderChunk of vite:css-post
    enforce: "pre",
    applyToEnvironment: (environment) => environment.name === "ssr",

    // A server file imports `jahiaComponent` from a wrapper that knows the file. The library is
    // external, and Rolldown checks `external` before `resolveId`: rewrite the import.
    transform: {
      // After the JSX transform, for `this.parse`
      order: "post",
      handler(code, id) {
        if (!isServerFile(id)) return;
        const s = new MagicString(code);
        let n = 0;
        for (const node of this.parse(code).body) {
          if (node.type !== "ImportDeclaration" || node.source.value !== LIBRARY) continue;
          for (const spec of node.specifiers) {
            if (spec.type !== "ImportSpecifier" || spec.imported.type !== "Identifier") continue;
            if (spec.imported.name !== "jahiaComponent") continue;
            s.overwrite(spec.start, spec.end, `jahiaComponent as __jahiaComponent${n++}`);
            s.append(
              `\nimport { jahiaComponent as ${spec.local.name} } from ${JSON.stringify(VIEW_SOURCE + id)};`,
            );
          }
        }
        return { code: s.toString(), map: s.generateMap({ source: id, hires: "boundary" }) };
      },
    },

    async resolveId(source, importer, options) {
      if (source.startsWith(VIEW_SOURCE)) return "\0" + source;
      if (!importer) return;

      // A bare import such as `import "modern-normalize"` can resolve to a stylesheet
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (!resolved || resolved.external || !CSS_RE.test(resolved.id)) return resolved;
      return { ...resolved, id: resolved.id + TRANSFORM_ONLY };
    },

    load(id) {
      if (!id.startsWith(VIEW_PREFIX)) return;
      return /* JS */ `
import { jahiaComponent as register, AddResources, buildModuleFileUrl } from ${JSON.stringify(LIBRARY)};
import { createElement, Fragment } from "react";

const css = "__JAHIA_CSS__${hex(id.slice(VIEW_PREFIX.length))}__";

export const jahiaComponent = (options, Component) => {
  register(options, (props, context) =>
    createElement(
      Fragment,
      null,
      ...css.map((href) =>
        createElement(AddResources, { key: href, type: "css", resources: buildModuleFileUrl(href) }),
      ),
      Component(props, context),
    ),
  );
  return Component;
};
`;
    },

    renderChunk(code) {
      if (!code.includes("__JAHIA_CSS__")) return;

      // Stylesheets reachable from `id`, in evaluation order
      const collect = (id: string, seen: Set<string>, out: string[]) => {
        if (seen.has(id)) return out;
        seen.add(id);
        if (id.endsWith(TRANSFORM_ONLY)) out.push(id);
        else for (const dep of this.getModuleInfo(id)?.importedIds ?? []) collect(dep, seen, out);
        return out;
      };

      const s = new MagicString(code);
      for (const match of code.matchAll(PLACEHOLDER_RE)) {
        const file = Buffer.from(match[1], "hex").toString();
        // vite:css-post emits each `__VITE_CSS_URL__` stylesheet and replaces it with its path
        const urls = collect(file, new Set(), []).map((id) => `"__VITE_CSS_URL__${hex(id)}__"`);
        s.overwrite(match.index, match.index + match[0].length, `[${urls.join(", ")}]`);
      }
      return { code: s.toString(), map: s.generateMap({ hires: "boundary" }) };
    },
  };
}
