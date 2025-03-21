import { AbsoluteArea, jahiaComponent } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    nodeType: "javascriptExample:testAbsoluteAreas",
    name: "default",
    displayName: "Test Absolute Areas (react)",
    componentType: "view",
  },
  (_, { currentNode }) => (
    <>
      <h2>React JAbsoluteArea test component</h2>

      <h2>Basic Area</h2>
      <div data-testid="basicArea">
        <AbsoluteArea name={"basicArea"} />
      </div>

      <h2>Area with allowed types</h2>
      <div data-testid="allowedTypesArea">
        <AbsoluteArea name={"allowedTypesArea"} allowedNodeTypes={["jnt:event", "jnt:bigText"]} />
      </div>

      <h2>Area with number of items</h2>
      <div data-testid="numberOfItemsArea">
        <AbsoluteArea name={"numberOfItemsArea"} numberOfItems={2} />
      </div>

      <h2>Area with areaView</h2>
      <div data-testid="areaViewArea">
        <AbsoluteArea name={"areaViewArea"} view={"dropdown"} />
      </div>

      <h2>Area with subNodesView</h2>
      <div data-testid="subNodesViewArea">
        <AbsoluteArea name={"subNodesViewArea"} />
      </div>

      <h2>Area with parent</h2>
      <div data-testid="parentArea">
        <AbsoluteArea name={"subLevel"} parent={currentNode.getNode("basicArea")} />
      </div>

      <h2>Absolute Area with home page content</h2>
      <div data-testid="absoluteArea">
        <AbsoluteArea name="pagecontent" />
      </div>

      <h2>Non editable area </h2>
      <div data-testid="nonEditableArea">
        <AbsoluteArea name="nonEditable" readOnly />
      </div>

      <h2>Absolute area level </h2>
      <div data-testid="absoluteAreaLevel">
        <AbsoluteArea name="pagecontent" />
      </div>

      <h2>Area type</h2>
      <div data-testid="areaType">
        <AbsoluteArea name="areaType" nodeType="javascriptExample:testAreaColumns" />
      </div>

      <h2>Limited absolute area editing</h2>
      <div data-testid="limitedAbsoluteAreaEdit">
        <AbsoluteArea name="pagecontent" readOnly="children" />
      </div>

      <h2>Absolute Area parameters</h2>
      <div data-testid="absoluteAreaParameters">
        <AbsoluteArea
          name="absoluteAreaParameters"
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
