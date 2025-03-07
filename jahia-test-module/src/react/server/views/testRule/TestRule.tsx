import { jahiaComponent } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    nodeType: "javascriptExample:testRule",
    name: "default",
    displayName: "test rule registration",
    componentType: "view",
  },
  ({ triggerProp, resultProp }) => {
    return (
      <>
        <h3>This component is used for testing Jahia rule deployment</h3>

        <div data-testid="testRule_triggerProp">jcr:title : {triggerProp}</div>
        <div data-testid="testRule_resultProp">prop1 : {resultProp}</div>
      </>
    );
  },
);
