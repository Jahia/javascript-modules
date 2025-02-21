import { Area, jahiaComponent } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    name: "default",
    nodeType: "javascriptExample:testAreaColumns",
    componentType: "view",
  },
  (_, { currentNode }) => {
    return (
      <div data-testid={`row-${currentNode.getName()}`}>
        <div data-testid={`${currentNode.getName()}-col-1`}>
          <Area name={`${currentNode.getName()}-col-1`} areaAsSubNode={true} />
        </div>
        <div data-testid={`${currentNode.getName()}-col-2`}>
          <Area name={`${currentNode.getName()}-col-2`} areaAsSubNode={true} />
        </div>
      </div>
    );
  },
);
