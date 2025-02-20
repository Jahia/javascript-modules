import {
  defineJahiaComponent,
  HydrateInBrowser,
  RenderInBrowser,
  useServerContext,
} from "@jahia/javascript-modules-library";
import SampleHydrateInBrowserReact from "$client/components/SampleHydrateInBrowserReact";
import SampleRenderInBrowserReact from "$client/components/SampleRenderInBrowserReact";

export const TestReactClientSide = () => {
  const { currentResource } = useServerContext();

  return (
    <>
      <h2>Just a normal view, that is using a client side react component: </h2>
      <HydrateInBrowser child={SampleHydrateInBrowserReact} props={{ initialValue: 9 }} />
      <RenderInBrowser
        child={SampleRenderInBrowserReact}
        props={{ path: currentResource.getNode().getPath() }}
      />
    </>
  );
};

TestReactClientSide.jahiaComponent = defineJahiaComponent({
  id: "test_react_react_client_side",
  nodeType: "javascriptExample:testReactClientSide",
  componentType: "view",
});
