import {
  AddContentButtons,
  getChildNodes,
  jahiaComponent,
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
        <PrintChildren title="All Children" testid="all" children={allChildren} />
        <PrintChildren title="Filtered Children" testid="filtered" children={filteredChildren} />
        <PrintChildren
          title="Filtered + offset Children"
          testid="filteredOffset"
          children={filteredOffsetChildren}
        />
        <PrintChildren
          title="Filtered + limit Children"
          testid="filteredLimit"
          children={filteredLimitChildren}
        />
        <PrintChildren
          title="Filtered + limit + offset Children"
          testid="filteredLimitOffset"
          children={filteredLimitOffsetChildren}
        />
        <PrintChildren title="Limit Children" testid="limit" children={limitChildren} />
        <PrintChildren
          title="Limit + offset Children"
          testid="limitOffset"
          children={limitOffsetChildren}
        />
        <PrintChildren
          title="Limit is mandatory"
          testid="limitMandatory"
          children={limitMandatory}
        />
        <PrintChildren title="Offset children" testid="offset" children={offsetChildren} />
        <AddContentButtons />
      </>
    );
  },
);
