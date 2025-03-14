import { buildNavMenu, jahiaComponent } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    nodeType: "jnt:page",
    name: "navMenu",
    displayName: "Nav Menu",
    componentType: "template",
  },
  (_, { renderContext, currentResource }) => {
    const baseNode = renderContext.getRequest().getParameter("baseline");
    const maxDepth = renderContext.getRequest().getParameter("maxDepth")
      ? parseInt(renderContext.getRequest().getParameter("maxDepth"), 10)
      : 10;
    const startLevel = renderContext.getRequest().getParameter("startLevel")
      ? parseInt(renderContext.getRequest().getParameter("startLevel"), 10)
      : 0;
    return (
      <div
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildNavMenu(
              maxDepth,
              baseNode,
              "menuComponent",
              startLevel,
              renderContext,
              currentResource,
            ),
          ),
        }}
      />
    );
  },
);
