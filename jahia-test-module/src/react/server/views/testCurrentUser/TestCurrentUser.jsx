import { defineJahiaComponent, useServerContext } from "@jahia/javascript-modules-library";

export const TestCurrentUser = () => {
  const { renderContext } = useServerContext();
  const currentUser = renderContext.getUser();
  return (
    <>
      <h3>Current user infos</h3>
      <div data-testid="currentUser_name">{currentUser.getName()}</div>
      <div data-testid="currentUser_isRoot">{currentUser.isRoot() ? "true" : "false"}</div>
    </>
  );
};

TestCurrentUser.jahiaComponent = defineJahiaComponent({
  nodeType: "javascriptExample:testCurrentUser",
  name: "default",
  displayName: "test current user",
  componentType: "view",
});
