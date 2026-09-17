import { jahiaComponent, server } from "@jahia/javascript-modules-library";

/**
 * Depends on the target by uuid, the one key form an unresolved reference can offer, and renders
 * its title next to a render marker: the Cypress test republishes the target and checks that the
 * fragment was flushed.
 */
jahiaComponent(
  {
    nodeType: "javascriptExample:testUuidCacheDependency",
    componentType: "view",
  },
  ({ targetPath }: { targetPath: string }, { renderContext, currentNode }) => {
    const target = currentNode.getSession().getNode(targetPath);
    server.render.addCacheDependency({ uuid: target.getIdentifier() }, renderContext);
    return (
      <div data-testid="uuid_dependency">
        <span data-testid="uuid_dependency_title">{target.getPropertyAsString("jcr:title")}</span>
        <span data-testid="uuid_dependency_rendered_at">{String(Date.now())}</span>
      </div>
    );
  },
);
