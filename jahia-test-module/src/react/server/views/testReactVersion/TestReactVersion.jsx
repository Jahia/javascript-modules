import { defineJahiaComponent } from "@jahia/javascript-modules-library";
import { version } from "react";

export const TestReactVersion = () => {
  return (
    <div>
      React version:<span data-testid="react-version">{version}</span>
    </div>
  );
};

TestReactVersion.jahiaComponent = defineJahiaComponent({
  nodeType: "javascriptExample:testReactVersion",
  name: "default",
  componentType: "view",
});
