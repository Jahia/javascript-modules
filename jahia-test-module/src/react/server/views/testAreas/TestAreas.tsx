import { Area, jahiaComponent } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    nodeType: "javascriptExample:testAreas",
    name: "default",
    displayName: "test Areas (react)",
    componentType: "view",
  },
  () => (
    <>
      <h2>React JArea test component</h2>

      <h2>Basic Area</h2>
      <div data-testid="basicArea">
        <Area name={"basicArea"} />
      </div>

      <h2>Area with allowed types</h2>
      <div data-testid="allowedTypesArea">
        <Area name={"allowedTypesArea"} allowedNodeTypes={["jnt:event", "jnt:bigText"]} />
      </div>

      <h2>Area with number of items</h2>
      <div data-testid="numberOfItemsArea">
        <Area name={"numberOfItemsArea"} numberOfItems={2} />
      </div>

      <h2>Area with areaView</h2>
      <div data-testid="areaViewArea">
        <Area name={"areaViewArea"} view={"dropdown"} />
      </div>

      <h2>Area with path</h2>
      <div data-testid="parentArea">
        <Area name={"basicArea/subLevel"} />
      </div>

      <h2>Non editable area </h2>
      <div data-testid="nonEditableArea">
        <Area name="nonEditable" readOnly />
      </div>

      <h2>Area type</h2>
      <div data-testid="areaType">
        <Area name="areaType" nodeType="javascriptExample:testAreaColumns" />
      </div>

      <h2>Area parameters</h2>
      <div data-testid="areaParameters">
        <Area
          name="areaParameters"
          view="parameters"
          parameters={{
            stringParam1: "stringValue1",
            stringParam2: "stringValue2",
          }}
        />
      </div>
    </>
  ),
);
