import {
  getNodesByJCRQuery,
  jahiaComponent,
  server,
  useServerContext,
} from "@jahia/javascript-modules-library";

const PrintQueryResults = ({ title, testid, nodes }) => (
  <>
    <h2>${title}</h2>
    <div data-testid={`getNodesByJCRQuery_${testid}`}>
      {nodes &&
        nodes.map(function (node, i) {
          return (
            <div data-testid={`getNodesByJCRQuery_${testid}_${i + 1}`} key={i}>
              {node.getPath()}
            </div>
          );
        })}
    </div>
  </>
);

jahiaComponent(
  {
    nodeType: "javascriptExample:testJCRQuery",
    displayName: "Test JCR query",
    componentType: "view",
  },
  () => {
    const { currentNode, renderContext } = useServerContext();
    const currentSiteKey = currentNode.getResolveSite().getSiteKey();
    const eventsPath = `/sites/${currentSiteKey}/contents/events`;
    const query = `SELECT *
                       from [jnt:event]
                       where isdescendantnode('${eventsPath}')`;
    server.render.addCacheDependency(
      { flushOnPathMatchingRegexp: `${eventsPath}/.*` },
      renderContext,
    );

    const all = getNodesByJCRQuery(currentNode.getSession(), query, -1);
    const limit = getNodesByJCRQuery(currentNode.getSession(), query, 2);
    const limitMandatory = getNodesByJCRQuery(currentNode.getSession(), query);
    const offset = getNodesByJCRQuery(currentNode.getSession(), query, -1, 2);
    const limitOffset = getNodesByJCRQuery(currentNode.getSession(), query, 2, 2);

    return (
      <>
        <h3>getChildNodes usages</h3>

        <PrintQueryResults title="All" testid="all" nodes={all} />
        <PrintQueryResults title="Limit" testid="limit" nodes={limit} />
        <PrintQueryResults
          title="Limit is mandatory"
          testid="limitMandatory"
          nodes={limitMandatory}
        />
        <PrintQueryResults title="Offset" testid="offset" nodes={offset} />
        <PrintQueryResults title="Limit + offset" testid="limitOffset" nodes={limitOffset} />
      </>
    );
  },
);
