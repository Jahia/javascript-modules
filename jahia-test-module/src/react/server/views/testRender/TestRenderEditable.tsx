import { getChildNodes, jahiaComponent, Render } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    nodeType: "javascriptExample:testRenderEditable",
    displayName: "Test JRender Editable",
    componentType: "view",
  },
  (_, { currentNode }) => {
    const allChildren = getChildNodes(currentNode, -1);
    return (
      <>
        <div data-testid="react-render-editable-default">
          <h3>Render generates editable items by default</h3>
          <div className="childs">
            {allChildren &&
              allChildren.map(function (child) {
                return <Render path={child.getPath()} key={child.getIdentifier()} />;
              })}
          </div>
        </div>
        <div data-testid="react-render-editable">
          <h3>Render generates editable items when precised true</h3>
          <div className="childs">
            {allChildren &&
              allChildren.map(function (child) {
                return (
                  <Render path={child.getPath()} key={child.getIdentifier()} />
                );
              })}
          </div>
        </div>
        <div data-testid="react-render-not-editable">
          <h3>Render generates non editable items when precised false</h3>
          <div className="childs">
            {allChildren &&
              allChildren.map(function (child) {
                return (
                  <Render path={child.getPath()} readOnly key={child.getIdentifier()} />
                );
              })}
          </div>
        </div>
      </>
    );
  },
);

jahiaComponent(
  {
    nodeType: "javascriptExample:simpleText",
    displayName: "Simple Text",
    componentType: "view",
  },
  ({ text }) => {
    return <div className="simple-text">{text}</div>;
  },
);
