import { jahiaComponent } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    nodeType: "javascriptExample:testCurrentUser",
    name: "default",
    displayName: "test current user",
    componentType: "view",
  },
  (_, { renderContext }) => {
    const currentUser = renderContext.getUser();
    return (
      <>
        <h3>Current user infos</h3>
        <div data-testid="currentUser_username">{currentUser.getUsername()}</div>
        <div data-testid="currentUser_isRoot">{currentUser.isRoot() ? "true" : "false"}</div>
      </>
    );
  },
);
