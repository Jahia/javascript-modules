import { jahiaComponent } from "@jahia/javascript-modules-library";
import { renderPriorityView } from "./helper";

/**
 * This example is for testing priorities on views where the highest priority is < 0 (all views have
 * a negative priority)
 */
jahiaComponent(
  {
    nodeType: "javascriptExample:testPriorityView2",
    componentType: "view",
    priority: -12,
  },
  () => renderPriorityView(-12),
);

jahiaComponent(
  {
    nodeType: "javascriptExampleMix:testPriorityViewMixin2",
    componentType: "view",
    priority: -6,
  },
  () => renderPriorityView(-6),
);

// view with the highest priority:
jahiaComponent(
  {
    nodeType: "javascriptExample:testPriorityView2",
    componentType: "view",
    priority: -3,
  },
  () => renderPriorityView(-3),
);

jahiaComponent(
  {
    nodeType: "javascriptExample:testPriorityView2",
    componentType: "view",
    priority: -7,
  },
  () => renderPriorityView(-7),
);
