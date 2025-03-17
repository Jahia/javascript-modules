import SampleI18n from "$client/components/SampleI18n";
import {
  getSiteLocales,
  HydrateInBrowser,
  jahiaComponent,
  RenderInBrowser,
} from "@jahia/javascript-modules-library";

jahiaComponent(
  {
    nodeType: "javascriptExample:testI18n",
    name: "default",
    displayName: "test i18n",
    componentType: "view",
  },
  () => (
    <>
      <h3>Test i18n: full server side</h3>
      <div data-testid="i18n-server-side">
        <SampleI18n placeholder={"We are server side !"} />
      </div>

      <h3>Test i18n: hydrated client side</h3>
      <div data-testid="i18n-hydrated-client-side">
        <HydrateInBrowser
          child={SampleI18n}
          props={{ placeholder: "We are hydrated client side !" }}
        />
      </div>

      <h3>Test i18n: rendered client side</h3>
      <div data-testid="i18n-rendered-client-side">
        <RenderInBrowser
          child={SampleI18n}
          props={{ placeholder: "We are rendered client side !" }}
        />
      </div>

      <h3>getSiteLocales()</h3>
      <div data-testid="getSiteLocales">{Object.keys(getSiteLocales()).join(",")}</div>
    </>
  ),
);
