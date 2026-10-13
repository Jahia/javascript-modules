import { buildNodeUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";

interface Props {
  image: JCRNodeWrapper;
}

const ImageAndRenderMarker = ({ src, testId }: { src: string; testId: string }) => (
  <div data-testid={testId}>
    <img src={src} alt="" />
    <span data-testid={`${testId}_rendered_at`}>{String(Date.now())}</span>
  </div>
);

/**
 * No view declares a cache dependency: building the URL is what registers one. The views differ
 * only in whether they let the engine collect it, and in how they call `buildNodeUrl`.
 */
jahiaComponent(
  {
    nodeType: "javascriptExample:testAutocollectedCacheDependency",
    componentType: "view",
  },
  ({ image }: Props) => <ImageAndRenderMarker src={buildNodeUrl(image)} testId="autocollected" />,
);

jahiaComponent(
  {
    nodeType: "javascriptExample:testAutocollectedCacheDependency",
    name: "noautocollect",
    componentType: "view",
    properties: { "cache.autocollectDependencies": "false" },
  },
  ({ image }: Props) => <ImageAndRenderMarker src={buildNodeUrl(image)} testId="optedout" />,
);

/** The context is passed explicitly, as a helper outside a component does. */
jahiaComponent(
  {
    nodeType: "javascriptExample:testAutocollectedCacheDependency",
    name: "explicitcontext",
    componentType: "view",
  },
  ({ image }: Props, { renderContext, currentResource }) => (
    <ImageAndRenderMarker
      src={buildNodeUrl(image, {}, { renderContext, currentResource })}
      testId="explicitcontext"
    />
  ),
);

jahiaComponent(
  {
    nodeType: "javascriptExample:testAutocollectedCacheDependency",
    name: "callopout",
    componentType: "view",
  },
  ({ image }: Props) => (
    <ImageAndRenderMarker
      src={buildNodeUrl(image, { autocollectDependency: false })}
      testId="callopout"
    />
  ),
);
