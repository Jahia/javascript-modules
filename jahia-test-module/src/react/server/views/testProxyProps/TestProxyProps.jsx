import { jahiaComponent } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    nodeType: "javascriptExample:testProxyProps",
    name: "default",
    displayName: "test proxyProps",
    componentType: "view",
  },
  ({ myFirstProp, mySecondProp, ...restOfProps }) => {
    return (
      <>
        <h3>proxyProps usages</h3>
        <div data-testid="proxyProps_myFirstProp">{myFirstProp}</div>
        <div data-testid="proxyProps_mySecondProp">{mySecondProp}</div>
        <div data-testid="proxyProps_restOfProps_myThirdProp">{restOfProps["myThirdProp"]}</div>
        <div data-testid="proxyProps_restOfProps_myFourthProp">{restOfProps["myFourthProp"]}</div>
        <div data-testid="proxyProps_restOfProps_in">
          {"myFourthProp" in restOfProps ? "true" : "false"}
        </div>
        {Object.entries(restOfProps).map(([key, value]) => (
          <div key={key} data-testid={`proxyProps_restOfProps_items_${key}`}>
            {typeof value === "object" ? JSON.stringify(value) : value}
          </div>
        ))}
      </>
    );
  },
);
