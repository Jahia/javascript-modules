import { getImageProps, jahiaComponent, JImage } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";

const reference = (node: JCRNodeWrapper, name: string): JCRNodeWrapper | undefined =>
  node.hasProperty(name) ? node.getProperty(name).getValue().getNode() : undefined;

jahiaComponent(
  {
    nodeType: "javascriptExample:testImage",
    name: "default",
    displayName: "test JImage",
    componentType: "view",
  },
  (_, { currentResource }) => {
    const node = currentResource.getNode();
    const image = reference(node, "image");
    const nonImage = reference(node, "nonImage");

    if (!image || !nonImage) {
      return <div data-testid="jimage_missing_fixture">Both references are required</div>;
    }

    return (
      <>
        {/* No alt: it falls back to the image's own jcr:title */}
        <div data-testid="jimage_title">
          <JImage src={image} />
        </div>

        <div data-testid="jimage_alt">
          <JImage src={image} alt="Explicit alt" />
        </div>

        {/* A decorative image: the empty alt is a decision and must survive the title fallback */}
        <div data-testid="jimage_decorative">
          <JImage src={image} alt="" />
        </div>

        <div data-testid="jimage_width">
          <JImage src={image} alt="" width={400} />
        </div>

        <div data-testid="jimage_height">
          <JImage src={image} alt="" height={600} />
        </div>

        <div data-testid="jimage_both">
          <JImage src={image} alt="" width={300} height={300} />
        </div>

        <div data-testid="jimage_attributes">
          <JImage
            src={image}
            alt=""
            id="jimage-attributes"
            className="custom-class"
            loading="lazy"
          />
        </div>

        {/* An og:image needs an absolute URL, which <JImage> deliberately does not expose, so the
            props tier is the route. Read back off data-url: outbound rewriting relativises src and
            href, and a meta rendered from a component view reaches neither the wrapping div nor the
            document head. */}
        <div data-testid="jimage_absolute_og_image">
          <span data-url={getImageProps(image, { absolute: true }).src}>og:image</span>
        </div>

        {/* A file with no jmix:image: neither dimension can be stated */}
        <div data-testid="jimage_no_dimensions">
          <JImage src={nonImage} alt="" />
        </div>
      </>
    );
  },
);
