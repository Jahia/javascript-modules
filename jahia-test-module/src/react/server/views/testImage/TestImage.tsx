import { getImageProps, jahiaComponent, JImage } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";

jahiaComponent(
  {
    nodeType: "javascriptExample:testImage",
    name: "default",
    displayName: "test JImage",
    componentType: "view",
  },
  ({
    image,
    smallImage,
    vectorImage,
    nonImage,
  }: {
    image?: JCRNodeWrapper;
    smallImage?: JCRNodeWrapper;
    vectorImage?: JCRNodeWrapper;
    nonImage?: JCRNodeWrapper;
  }) => {
    if (!image || !smallImage || !vectorImage || !nonImage) {
      return <div data-testid="jimage_missing_fixture">Every reference is required</div>;
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

        {/* The candidate set reaches the DOM: `srcset` in its React spelling, and `sizes` with the
            `auto` keyword that only a lazily loaded image may carry. */}
        <div data-testid="jimage_srcset">
          <JImage src={image} alt="" />
        </div>

        {/* Eager: `auto` needs lazy loading, so the default drops to a plain `100vw`. */}
        <div data-testid="jimage_eager">
          <JImage src={image} alt="" loading="eager" />
        </div>

        <div data-testid="jimage_custom_sizes">
          <JImage src={image} alt="" sizes={["(width >= 600px) 50vw", "100vw"]} />
        </div>

        <div data-testid="jimage_custom_srcset">
          <JImage src={image} alt="" srcSet={[1200, 400, 800]} />
        </div>

        {/* Narrower than every default width: one candidate is no candidate set at all. */}
        <div data-testid="jimage_small">
          <JImage src={smallImage} alt="" />
        </div>

        {/* An SVG scales by itself, so it is served whole. */}
        <div data-testid="jimage_vector">
          <JImage src={vectorImage} alt="" />
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
