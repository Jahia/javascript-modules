import { jahiaComponent } from "@jahia/javascript-modules-library";
import { renderPriorityTemplate } from "./helper";

/**
 * This example is for testing priorities on templates where the highest priority template is a
 * mixin
 */
jahiaComponent(
  {
    nodeType: "jnt:page",
    componentType: "template",
    name: "testPriorityTemplateExample3",
    displayName: "Template example priority 15",
    priority: 15,
  },
  () => renderPriorityTemplate(15),
);

jahiaComponent(
  {
    nodeType: "jnt:page",
    componentType: "template",
    name: "testPriorityTemplateExample3",
    displayName: "Template example priority -8",
    priority: -8,
  },
  () => renderPriorityTemplate(-8),
);

// template with the highest priority:
jahiaComponent(
  {
    nodeType: "javascriptExampleMix:testPriorityTemplateMixin3",
    componentType: "template",
    name: "testPriorityTemplateExample3",
    displayName: "Template example priority 50",
    priority: 50,
  },
  () => renderPriorityTemplate(50),
);
jahiaComponent(
  {
    nodeType: "javascriptExampleMix:testPriorityTemplateMixin3",
    componentType: "template",
    name: "testPriorityTemplateExample3",
    displayName: "Template example priority 25",
    priority: 25,
  },
  () => renderPriorityTemplate(25),
);
