import { jahiaComponent, useGQLQuery } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    nodeType: "javascriptExample:testGQL",
    name: "default",
    displayName: "test JGQL (react)",
    componentType: "view",
  },
  (_, { currentNode }) => {
    const result = useGQLQuery({
      query:
        "query ($path:String!) { jcr { nodeByPath(path:$path) { name, properties { name, value } } } }",
      variables: { path: currentNode.getPath() },
    });
    return (
      <>
        <div data-testid="react-view">React view working</div>
        <hr />

        <h3>GraphQL</h3>
        <div
          data-testid="gql-info-test"
          style={{ padding: "10px", margin: "10px", border: "1px solid" }}
        >
          <ul>
            {result.data.jcr.nodeByPath.properties.map(
              (property: { name: string; value: string }) => (
                <li key={property.name} data-testid={property.name}>
                  {property.name}={property.value}
                </li>
              ),
            )}
          </ul>
        </div>
        <hr />
      </>
    );
  },
);
