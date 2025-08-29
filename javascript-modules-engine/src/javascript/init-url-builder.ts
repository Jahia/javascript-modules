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
    let workspace: string;
    let servletPath: string;
    switch (mode) {
      case "edit":
        servletPath = "/cms/edit";
        workspace = "default";
        break;
      case "preview":
        servletPath = "/cms/render";
        workspace = "default";
        break;
      default:
        servletPath = "/cms/render";
        workspace = "live";
        break;
    }
    return `${servletPath}/${workspace}/${language}${server.render.escapePath(node.getPath())}${extension ? extension : ".html"}`;
  },
});
