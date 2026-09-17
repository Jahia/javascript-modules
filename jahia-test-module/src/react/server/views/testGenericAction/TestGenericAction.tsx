import { Island, jahiaComponent } from "@jahia/javascript-modules-library";
import SampleGenericAction from "$client/components/SampleGenericAction";

jahiaComponent(
  {
    id: "test_generic_action",
    nodeType: "javascriptExample:testGenericAction",
    componentType: "view",
  },
  () => (
    <>
      <h2>Actions (.action.ts) called from a client island:</h2>
      <Island component={SampleGenericAction} />
    </>
  ),
);
