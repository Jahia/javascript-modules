import { jahiaComponent } from "@jahia/javascript-modules-library";
import { renderPriorityView } from "./helper";

/** This example is for testing priorities on views where the highest priority is > 0 */
jahiaComponent(
  {
    nodeType: "javascriptExample:testPriorityView1",
    componentType: "view",
    priority: -5,
  },
  () => renderPriorityView(-5),
);

// view with the highest priority:
jahiaComponent(
  {
    nodeType: "javascriptExample:testPriorityView1",
    componentType: "view",
    priority: 6,
  },
  () => renderPriorityView(6),
);

jahiaComponent(
  {
    nodeType: "javascriptExampleMix:testPriorityViewMixin1",
    componentType: "view",
    priority: -3,
  },
  () => renderPriorityView(-3),
);

jahiaComponent(
  {
    nodeType: "javascriptExample:testPriorityView1",
    componentType: "view",
    // default priority (0)
  },
  () => renderPriorityView(0),
);

jahiaComponent(
  {
    nodeType: "javascriptExample:testPriorityView1",
    componentType: "view",
    priority: 2,
  },
  () => renderPriorityView(2),
);
