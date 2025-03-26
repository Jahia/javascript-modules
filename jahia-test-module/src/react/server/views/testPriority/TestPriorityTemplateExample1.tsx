import { jahiaComponent } from "@jahia/javascript-modules-library";
import { renderPriorityTemplate } from "./helper";

/** This example is for testing priorities on templates where the highest priority is > 0 */
jahiaComponent(
  {
    nodeType: "jnt:page",
    componentType: "template",
    name: "testPriorityTemplateExample1",
    displayName: "Template example priority -5",
    priority: -5,
  },
  () => renderPriorityTemplate(-5),
);

// template with the highest priority:
jahiaComponent(
  {
    nodeType: "jnt:page",
    componentType: "template",
    name: "testPriorityTemplateExample1",
    displayName: "Template example priority 9",
    priority: 9,
  },
  () => renderPriorityTemplate(9),
);

jahiaComponent(
  {
    nodeType: "jnt:page",
    componentType: "template",
    name: "testPriorityTemplateExample1",
    displayName: "Template example priority 3",
    priority: 3,
  },
  () => renderPriorityTemplate(3),
);
