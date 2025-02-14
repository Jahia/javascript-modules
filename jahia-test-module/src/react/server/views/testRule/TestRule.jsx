import {
  defineJahiaComponent,
  getNodeProps,
  useServerContext,
} from "@jahia/javascript-modules-library";

export const TestRule = () => {
  const { currentNode } = useServerContext();
  const props = getNodeProps(currentNode, ["triggerProp", "resultProp"]);

  return (
    <>
      <h3>This component is used for testing Jahia rule deployment</h3>

      <div data-testid="testRule_triggerProp">jcr:title : {props.triggerProp}</div>
      <div data-testid="testRule_resultProp">prop1 : {props.resultProp}</div>
    </>
  );
};

TestRule.jahiaComponent = defineJahiaComponent({
  nodeType: "npmExample:testRule",
  name: "default",
  displayName: "test rule registration",
  componentType: "view",
});
