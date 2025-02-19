import React from "react";
import { defineJahiaComponent } from "@jahia/javascript-modules-library";

export const TestReactVersion = () => {
  return (
    <div>
      React version:<span data-testid="react-version">{React.version}</span>
    </div>
  );
};

TestReactVersion.jahiaComponent = defineJahiaComponent({
  nodeType: "javascriptExample:testReactVersion",
  name: "default",
  componentType: "view",
});
