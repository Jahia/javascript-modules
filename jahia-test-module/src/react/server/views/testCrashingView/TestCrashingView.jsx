import { defineJahiaComponent, useServerContext } from "@jahia/javascript-modules-library";

export const TestCrashingView = () => {
  const { currentNode } = useServerContext();
  currentNode.getProperty("not_existing_property");

  return (
    <>
      <p>This view is expected to crash</p>
    </>
  );
};

TestCrashingView.jahiaComponent = defineJahiaComponent({
  nodeType: "npmExample:testCrashingView",
  name: "default",
  displayName: "test crashing view",
  componentType: "view",
});
