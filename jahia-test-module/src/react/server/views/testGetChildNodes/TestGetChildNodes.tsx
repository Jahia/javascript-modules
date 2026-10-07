import {
  AddContentButtons,
  getChildNodes,
  jahiaComponent,
  RenderChild,
  RenderChildren,
} from "@jahia/javascript-modules-library";
import type { Node } from "javax.jcr";

const PrintChildren = ({
  children,
  title,
  testid,
}: {
  children: Node[];
  title: string;
  testid: string;
}) => (
  <>
    <h2>${title}</h2>
    <div data-testid={`getChildNodes_${testid}`}>
      {children &&
        children.map(function (child, i) {
          return (
            <div data-testid={`getChildNodes_${testid}_${i + 1}`} key={child.getPath()}>
              {child.getPath()}
            </div>
          );
        })}
    </div>
  </>
);

jahiaComponent(
  {
    nodeType: "javascriptExample:testGetChildNodes",
    name: "default",
    displayName: "test getChildNodes",
    componentType: "view",
  },
  (_, { currentNode }) => {
    const allChildren = getChildNodes(currentNode, -1);
    const filteredChildren = getChildNodes(currentNode, -1, 0, (child) => {
      return child.getName().includes("filtered");
    });
    const filteredOffsetChildren = getChildNodes(currentNode, -1, 1, (child) => {
      return child.getName().includes("filtered");
    });
    const filteredLimitChildren = getChildNodes(currentNode, 1, 0, (child) => {
      return child.getName().includes("filtered");
    });
    const filteredLimitOffsetChildren = getChildNodes(currentNode, 1, 1, (child) => {
      return child.getName().includes("filtered");
    });
    const limitChildren = getChildNodes(currentNode, 2);
    const limitOffsetChildren = getChildNodes(currentNode, 2, 2);
    const limitMandatory = getChildNodes(currentNode);
    const offsetChildren = getChildNodes(currentNode, -1, 2);

    return (
      <>
        <h3>getChildNodes usages</h3>
        <PrintChildren title="All Children" testid="all">
          {allChildren}
        </PrintChildren>
        <PrintChildren title="Filtered Children" testid="filtered">
          {filteredChildren}
        </PrintChildren>
        <PrintChildren title="Filtered + offset Children" testid="filteredOffset">
          {filteredOffsetChildren}
        </PrintChildren>
        <PrintChildren title="Filtered + limit Children" testid="filteredLimit">
          {filteredLimitChildren}
        </PrintChildren>
        <PrintChildren title="Filtered + limit + offset Children" testid="filteredLimitOffset">
          {filteredLimitOffsetChildren}
        </PrintChildren>
        <PrintChildren title="Limit Children" testid="limit">
          {limitChildren}
        </PrintChildren>
        <PrintChildren title="Limit + offset Children" testid="limitOffset">
          {limitOffsetChildren}
        </PrintChildren>
        <PrintChildren title="Limit is mandatory" testid="limitMandatory">
          {limitMandatory}
        </PrintChildren>
        <PrintChildren title="Offset children" testid="offset">
          {offsetChildren}
        </PrintChildren>
        <AddContentButtons />

        <h3>RenderChildren</h3>
        <div data-testid="renderAllChildren">
          <RenderChildren view="path" />
        </div>
        <div data-testid="renderFilteredChildren">
          <RenderChildren view="path" filter={(node) => node.getName().includes("filtered")} />
        </div>
        <div data-testid="renderPaginatedChildren">
          <RenderChildren view="path" pagination={{ start: 1, count: 2 }} />
        </div>

        <h3>RenderChild</h3>
        <div data-testid="renderChild">
          <RenderChild name="child1" view="path" />
        </div>
      </>
    );
  },
);

jahiaComponent(
  {
    nodeType: "javascriptExample:testGetChildNodes",
    name: "path",
    displayName: "test getChildNodes",
    componentType: "view",
  },
  (_, { currentNode }) => <div>{currentNode.getPath()}</div>,
);
