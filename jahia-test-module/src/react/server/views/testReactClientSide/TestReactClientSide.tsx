import { Island, jahiaComponent } from "@jahia/javascript-modules-library";
import SampleClientOnlyChildren from "$client/components/SampleClientOnlyChildren";
import SampleModal from "$client/components/SampleModal";
import SampleHydrateInBrowserReact from "$client/components/SampleHydrateInBrowserReact";
import SampleRenderInBrowserReact from "$client/components/SampleRenderInBrowserReact";

jahiaComponent(
  {
    id: "test_react_react_client_side",
    nodeType: "javascriptExample:testReactClientSide",
    componentType: "view",
  },
  (_, { currentResource }) => {
    return (
      <>
        <h2>Just a normal view, that is using a client side react component: </h2>
        <Island
          component={SampleHydrateInBrowserReact}
          props={{ initialValue: 9, set: new Set(["a", "b", "c"]) }}
        >
          <p data-testid="ssr-child">Server-side rendered</p>
        </Island>
        <Island
          clientOnly
          component={SampleRenderInBrowserReact}
          props={{ path: currentResource.getNode().getPath() }}
        >
          <p data-testid="ssr-placeholder">Server-side placeholder</p>
        </Island>
        <Island clientOnly component={SampleClientOnlyChildren}>
          <p data-testid="client-only-child">Server-side child of a client-only island</p>
        </Island>
        <Island clientOnly="hide-children-while-loading" component={SampleModal}>
          <p data-testid="modal-child">Server-side child of a modal</p>
        </Island>
      </>
    );
  },
);
