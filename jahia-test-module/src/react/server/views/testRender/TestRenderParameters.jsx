import { jahiaComponent } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    nodeType: "javascriptExample:testRender",
    name: "parameters",
    displayName: "test Render (parameters react)",
    componentType: "view",
  },
  (_, { currentResource }) => {
    return (
      <>
        <h3>Parameter view {currentResource.getNode().getName()}</h3>
        <div data-testid="renderParam-string1">
          stringParam={currentResource.getModuleParams().get("stringParam")}
        </div>
        <div data-testid="renderParam-string2">
          stringParam2={currentResource.getModuleParams().get("stringParam2")}
        </div>
        <div data-testid="renderParam-notString-notSupported">
          objectParam not supported=
          {currentResource.getModuleParams().get("objectParam")}
        </div>
      </>
    );
  },
);
