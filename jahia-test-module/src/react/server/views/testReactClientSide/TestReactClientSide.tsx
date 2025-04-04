import {
  HydrateInBrowser,
  jahiaComponent,
  RenderInBrowser,
} from "@jahia/javascript-modules-library";
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
        <HydrateInBrowser
          child={SampleHydrateInBrowserReact}
          props={{ initialValue: 9, set: new Set(["a", "b", "c"]) }}
        >
          <p data-testid="ssr-child">Server-side rendered</p>
        </HydrateInBrowser>
        <RenderInBrowser
          child={SampleRenderInBrowserReact}
          props={{ path: currentResource.getNode().getPath() }}
        >
          <p data-testid="ssr-placeholder">Server-side placeholder</p>
        </RenderInBrowser>
      </>
    );
  },
);
