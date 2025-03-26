import { jahiaComponent } from "@jahia/javascript-modules-library";
import { renderPriorityView } from "./helper";

/**
 * This example is for testing priorities on views where the highest priority is the default (0)
 * (all views have a negative priority)
 */
jahiaComponent(
  {
    nodeType: "javascriptExample:testPriorityView3",
    componentType: "view",
    priority: -12,
  },
  () => renderPriorityView(-12),
);

jahiaComponent(
  {
    nodeType: "javascriptExample:testPriorityView3",
    componentType: "view",
    priority: -6,
  },
  () => renderPriorityView(-6),
);

jahiaComponent(
  {
    nodeType: "javascriptExample:testPriorityView3",
    componentType: "view",
    priority: -3,
  },
  () => renderPriorityView(-3),
);

// view with the highest priority:
jahiaComponent(
  {
    nodeType: "javascriptExample:testPriorityView3",
    componentType: "view",
    // default priority (0)
  },
  () => renderPriorityView(0),
);

jahiaComponent(
  {
    nodeType: "javascriptExample:testPriorityView3",
    componentType: "view",
    priority: -7,
  },
  () => renderPriorityView(-7),
);
