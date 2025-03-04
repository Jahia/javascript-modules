import React from "react";
import { jahiaComponent } from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    name: "default",
    nodeType: "$MODULE:simpleContent",
    displayName: "Simple Content (default)",
    componentType: "view",
  },
  ({ title }) => (
    <div>
      <h2>{title}</h2>
    </div>
  ),
);
