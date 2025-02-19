import {
  getChildNodes,
  getNodeProps,
  Render,
  useServerContext,
  defineJahiaComponent,
} from "@jahia/javascript-modules-library";

export const TestRenderEditable = () => {
  const { currentNode } = useServerContext();
  const allChildren = getChildNodes(currentNode, -1);
  return (
    <>
      <div data-testid="react-render-editable-default">
        <h3>Render generates editable items by default</h3>
        <div class="childs">
          {allChildren &&
            allChildren.map(function (child, i) {
              return <Render path={child.getPath()} key={child.getIdentifier()} />;
            })}
        </div>
      </div>
      <div data-testid="react-render-editable">
        <h3>Render generates editable items when precised true</h3>
        <div class="childs">
          {allChildren &&
            allChildren.map(function (child, i) {
              return <Render path={child.getPath()} editable={true} key={child.getIdentifier()} />;
            })}
        </div>
      </div>
      <div data-testid="react-render-not-editable">
        <h3>Render generates non editable items when precised false</h3>
        <div class="childs">
          {allChildren &&
            allChildren.map(function (child, i) {
              return <Render path={child.getPath()} editable={false} key={child.getIdentifier()} />;
            })}
        </div>
      </div>
    </>
  );
};

TestRenderEditable.jahiaComponent = defineJahiaComponent({
  nodeType: "javascriptExample:testRenderEditable",
  displayName: "Test JRender Editable",
  componentType: "view",
});

export const SimpleText = () => {
  const { currentNode } = useServerContext();
  const props = getNodeProps(currentNode, ["text"]);
  return <div className="simple-text">{props.text}</div>;
};

SimpleText.jahiaComponent = defineJahiaComponent({
  nodeType: "javascriptExample:simpleText",
  displayName: "Simple Text",
  componentType: "view",
});
