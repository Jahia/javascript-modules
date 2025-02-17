import { jahiaComponent, server } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    // we provide an id here to make sure the registration also works properly for this case, by it is not mandatory
    id: "@@@customid//for-testing@@@_view_javascriptExample:testReactViewRegistration_default",
    nodeType: "javascriptExample:testReactViewRegistration",
    displayName: "Test React registration",
    componentType: "view",
  },
  () => {
    const testAreasName = server.registry.get(
      "view",
      "jahia-javascript-module-example_view_javascriptExample:testAreas_default",
    ).name;
    const testRegistryName = server.registry.get(
      "view",
      "@@@customid//for-testing@@@_view_javascriptExample:testReactViewRegistration_default",
    ).name;
    // We test non existant entries to make sure that the ProxyObject is not created by the RegistryHelper in this case
    const nonExistantComponent = server.registry.get("view", "@@@thisobjectdoesnotexist@@@");
    return (
      <>
        <div data-testid="standardViewRegistration">
          javascriptExample:testAreas view component name=[{testAreasName}]
        </div>
        <div data-testid="customViewRegistration">
          javascriptExample:testReactViewRegistration view component name=[
          {testRegistryName}]
        </div>
        <div data-testid="noRegistration">
          Non existing component=[{nonExistantComponent || "null"}]
        </div>
      </>
    );
  },
);
