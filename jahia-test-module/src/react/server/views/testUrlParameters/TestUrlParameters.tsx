import { jahiaComponent } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    nodeType: "javascriptExample:testUrlParameters",
    name: "default",
    displayName: "test url parameters",
    componentType: "view",
  },
  (_, { renderContext }) => {
    const urlParam = renderContext.getRequest().getParameter("test");
    return (
      <>
        <h3>Url parameters</h3>
        <div data-testid="renderContext_urlParameters">{urlParam}</div>
      </>
    );
  },
);
