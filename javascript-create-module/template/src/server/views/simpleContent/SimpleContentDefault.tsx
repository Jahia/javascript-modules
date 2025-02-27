import React from "react";
import { jahiaComponent } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    name: "default",
    nodeType: "$$MODULE_NAMESPACE$$:simpleContent",
    displayName: "Simple Content (default)",
    componentType: "view",
  },
  ({ title }) => (
    <div>
      <h2>Test:{title}</h2>
    </div>
  ),
);
