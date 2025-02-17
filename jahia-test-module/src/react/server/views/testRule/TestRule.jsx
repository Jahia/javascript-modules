import { getNodeProps, jahiaComponent } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    nodeType: "javascriptExample:testRule",
    name: "default",
    displayName: "test rule registration",
    componentType: "view",
  },
  (_, { currentNode }) => {
    const props = getNodeProps(currentNode, ["triggerProp", "resultProp"]);

    return (
      <>
        <h3>This component is used for testing Jahia rule deployment</h3>

        <div data-testid="testRule_triggerProp">jcr:title : {props.triggerProp}</div>
        <div data-testid="testRule_resultProp">prop1 : {props.resultProp}</div>
      </>
    );
  },
);
