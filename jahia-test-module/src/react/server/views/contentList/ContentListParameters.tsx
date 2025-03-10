import { jahiaComponent } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    nodeType: "jnt:contentList",
    name: "parameters",
    displayName: "Test Area with parameters",
    componentType: "view",
  },
  (_, { currentResource }) => {
    return (
      <>
        <h3>Parameter view {currentResource.getNode().getName()}</h3>
        <div data-testid="areaParam-string1">
          stringParam1={currentResource.getModuleParams().get("stringParam1")?.toString()}
        </div>
        <div data-testid="areaParam-string2">
          stringParam2={currentResource.getModuleParams().get("stringParam2")?.toString()}
        </div>
      </>
    );
  },
);
