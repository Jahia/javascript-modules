import { buildNodeUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";

interface Props {
  image: JCRNodeWrapper;
}

const ImageAndRenderMarker = ({ image, testId }: { image: JCRNodeWrapper; testId: string }) => (
  <div data-testid={testId}>
    <img src={buildNodeUrl(image)} alt="" />
    <span data-testid={`${testId}_rendered_at`}>{String(Date.now())}</span>
  </div>
);

/**
 * Neither view declares a cache dependency: building the URL is what registers one. The two differ
 * only in whether they let the engine collect it.
 */
jahiaComponent(
  {
    nodeType: "javascriptExample:testAutocollectedCacheDependency",
    componentType: "view",
  },
  ({ image }: Props) => <ImageAndRenderMarker image={image} testId="autocollected" />,
);

jahiaComponent(
  {
    nodeType: "javascriptExample:testAutocollectedCacheDependency",
    name: "noautocollect",
    componentType: "view",
    properties: { "cache.autocollectDependencies": "false" },
  },
  ({ image }: Props) => <ImageAndRenderMarker image={image} testId="optedout" />,
);
