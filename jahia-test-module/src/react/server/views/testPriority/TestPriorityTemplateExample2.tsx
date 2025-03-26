import { jahiaComponent } from "@jahia/javascript-modules-library";
import { renderPriorityTemplate } from "./helper";

/** This example is for testing priorities on templates where the highest priority is < 0 */
// template with the highest priority:
jahiaComponent(
  {
    nodeType: "jnt:page",
    componentType: "template",
    name: "testPriorityTemplateExample2",
    displayName: "Template example priority -5",
    priority: -5,
  },
  () => renderPriorityTemplate(-5),
);

jahiaComponent(
  {
    nodeType: "jnt:page",
    componentType: "template",
    name: "testPriorityTemplateExample2",
    displayName: "Template example priority -8",
    priority: -8,
  },
  () => renderPriorityTemplate(-8),
);

jahiaComponent(
  {
    nodeType: "jnt:page",
    componentType: "template",
    name: "testPriorityTemplateExample2",
    displayName: "Template example priority -999",
    priority: -999,
  },
  () => renderPriorityTemplate(-999),
);
