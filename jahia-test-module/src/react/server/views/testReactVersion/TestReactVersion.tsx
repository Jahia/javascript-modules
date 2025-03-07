import { jahiaComponent } from "@jahia/javascript-modules-library";
import { version } from "react";

jahiaComponent(
  {
    nodeType: "javascriptExample:testReactVersion",
    name: "default",
    componentType: "view",
  },
  () => (
    <div>
      React version:<span data-testid="react-version">{version}</span>
    </div>
  ),
);
