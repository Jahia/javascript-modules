import type { JCRNodeWrapper } from "org.jahia.services.content";

server.registry.add("urlBuilder", "nt:file", {
  priority: 1,
  buildURL: ({ node, mode }: { node: JCRNodeWrapper; mode: string }) => {
    const workspace = mode === "edit" || mode === "preview" ? "default" : "live";
    return `/files/${workspace}${server.render.escapePath(node.getCanonicalPath())}`;
  },
});
server.registry.add("urlBuilder", "*", {
  priority: 0,
  buildURL: ({
    node,
    mode,
    language,
    extension,
  }: {
    node: JCRNodeWrapper;
    mode: string;
    language: string;
    extension: string;
  }) => {
    let base: string;
    switch (mode) {
      case "edit":
        base = "/cms/edit/default";
        break;
      case "preview":
        base = "/cms/render/default";
        break;
      default:
        base = "/cms/render/live";
        break;
    }
    return `${base}/${language}${server.render.escapePath(node.getPath())}${extension ? extension : ".html"}`;
  },
});
