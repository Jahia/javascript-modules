import { AbsoluteArea, jahiaComponent } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    nodeType: "javascriptExample:testAbsoluteAreas",
    name: "default",
    displayName: "Test Absolute Areas (react)",
    componentType: "view",
  },
  (_, { currentNode, renderContext }) => (
    <>
      <h2>React JAbsoluteArea test component</h2>

      <h2>Basic Area</h2>
      <div data-testid="basicArea">
        <AbsoluteArea name={"basicArea"} parent={currentNode} />
      </div>

      <h2>Area with allowed types</h2>
      <div data-testid="allowedTypesArea">
        <AbsoluteArea
          name={"allowedTypesArea"}
          parent={currentNode}
          allowedNodeTypes={["jnt:event", "jnt:bigText"]}
        />
      </div>

      <h2>Area with number of items</h2>
      <div data-testid="numberOfItemsArea">
        <AbsoluteArea name={"numberOfItemsArea"} parent={currentNode} numberOfItems={2} />
      </div>

      <h2>Area with areaView</h2>
      <div data-testid="areaViewArea">
        <AbsoluteArea name={"areaViewArea"} parent={currentNode} view={"dropdown"} />
      </div>

      <h2>Area with parent</h2>
      <div data-testid="parentArea">
        <AbsoluteArea name="subLevel" parent={currentNode.getNode("basicArea")} />
      </div>

      <h2>Absolute Area with home page</h2>
      <div data-testid="absoluteAreaHomePage">
        <AbsoluteArea name="pagecontent" parent={renderContext.getSite().getHome()} />
      </div>

      <h2>Absolute Area with custom page (sub-level)</h2>
      <div data-testid="absoluteAreaCustomPage">
        <AbsoluteArea
          name="pagecontent"
          parent={renderContext.getSite().getNode("custom/sub-level")}
        />
      </div>

      <h2>Non editable area </h2>
      <div data-testid="nonEditableArea">
        <AbsoluteArea name="nonEditable" parent={currentNode} readOnly />
      </div>

      <h2>Area type</h2>
      <div data-testid="areaType">
        <AbsoluteArea
          name="areaType"
          parent={currentNode}
          nodeType="javascriptExample:testAreaColumns"
        />
      </div>

      <h2>Limited absolute area editing</h2>
      <div data-testid="limitedAbsoluteAreaEdit">
        <AbsoluteArea name="pagecontent" parent={currentNode} readOnly="children" />
      </div>

      <h2>Absolute Area parameters</h2>
      <div data-testid="absoluteAreaParameters">
        <AbsoluteArea
          name="absoluteAreaParameters"
          parent={currentNode}
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
