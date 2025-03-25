import { jahiaComponent } from "@jahia/javascript-modules-library";
import { renderPriorityView } from "./helper";

/** This example is for testing priorities on views where the highest priority is the mixin */
// view with the highest priority:
jahiaComponent(
  {
    nodeType: "javascriptExampleMix:testPriorityViewMixin4",
    componentType: "view",
    priority: 13,
  },
  () => renderPriorityView(13),
);

jahiaComponent(
  {
    nodeType: "javascriptExample:testPriorityView4",
    componentType: "view",
    priority: 5,
  },
  () => renderPriorityView(5),
);

jahiaComponent(
  {
    nodeType: "javascriptExample:testPriorityView4",
    componentType: "view",
    priority: -3,
  },
  () => renderPriorityView(-3),
);

jahiaComponent(
  {
    nodeType: "javascriptExample:testPriorityView4",
    componentType: "view",
    priority: 0,
  },
  () => renderPriorityView(0),
);

jahiaComponent(
  {
    nodeType: "javascriptExampleMix:testPriorityViewMixin4",
    componentType: "view",
    priority: 9,
  },
  () => renderPriorityView(9),
);
