import {
  getImageProps,
  jahiaComponent,
  JImage,
  type ImageProps,
} from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";

/**
 * `getImageProps` is a pure function, but it only runs on GraalJS with a real `JCRNodeWrapper`, so
 * the suite exercises it here and asserts the returned attributes in `imageTest.cy.ts`. One case
 * per branch; the case id is what the spec looks up.
 */
const Case = ({ id, props }: { id: string; props: ImageProps }) => (
  <span data-testid={`case_${id}`} data-props={JSON.stringify(props)} />
);

jahiaComponent(
  {
    nodeType: "javascriptExample:testImage",
    name: "default",
    displayName: "test getImageProps and JImage",
    componentType: "view",
  },
  ({
    largeImage: large,
    exactImage: exact,
    smallImage: small,
    commaImage: comma,
    vectorImage: vector,
    nonImage,
  }: {
    largeImage?: JCRNodeWrapper;
    exactImage?: JCRNodeWrapper;
    smallImage?: JCRNodeWrapper;
    commaImage?: JCRNodeWrapper;
    vectorImage?: JCRNodeWrapper;
    nonImage?: JCRNodeWrapper;
  }) => {
    if (!large || !exact || !small || !comma || !vector || !nonImage) {
      return <div data-testid="image_missing_fixture">Every reference is required</div>;
    }

    // A DAM node answers getUrl(args) with a URL on its own host, and the resize travels in those
    // arguments rather than in a query string. No such provider is mounted here, so this stands in
    // for one, implementing only what getImageProps reads. The URL mimics a Cloudinary path: a
    // two-argument resize carries the comma the srcset workaround exists for.
    const damNode = {
      getIdentifier: () => "dam-stand-in",
      hasProperty: () => false,
      hasNode: () => false,
      getProvider: () => ({ isDefault: () => false }),
      // buildNodeUrl collects this as a cache dependency, so it must be a real node's.
      getCanonicalPath: () => large.getCanonicalPath(),
      getUrl: (args?: string[]) =>
        `https://media.dam.test/${args ? `${args.map((arg) => arg.replace(":", "_")).join(",")}/` : ""}asset.jpg`,
    } as unknown as JCRNodeWrapper;

    return (
      <>
        {/* Vector: the resize channel cannot scale an SVG, so no candidate set is offered. */}
        <Case id="vector" props={getImageProps(vector, {})} />
        <Case id="vector_sized" props={getImageProps(vector, { width: 100 })} />

        {/* alt */}
        <Case id="alt_default" props={getImageProps(large, {})} />
        <Case id="alt_explicit" props={getImageProps(large, { alt: "Explicit alt" })} />
        <Case id="alt_decorative" props={getImageProps(large, { alt: "" })} />

        {/* A width that is not a usable dimension is discarded, which lands on the responsive
            branch rather than producing a `0x` or `-30.00x` descriptor. */}
        <Case id="guard_zero" props={getImageProps(large, { width: 0 })} />
        <Case id="guard_negative" props={getImageProps(large, { width: -100 })} />

        {/* Density descriptors: a width and/or a height is requested. */}
        <Case id="density_width" props={getImageProps(large, { width: 400 })} />
        <Case id="density_height" props={getImageProps(large, { height: 600 })} />
        <Case id="density_both" props={getImageProps(large, { width: 300, height: 300 })} />
        {/* 4x and 3x exceed the 2832px original, so they are dropped and the original takes the top
            rung at its real density, 2.832x. */}
        <Case id="density_clamped" props={getImageProps(large, { width: 1000 })} />
        {/* 4x is exactly the 2048px original: the limit value, which must be kept. */}
        <Case id="density_exact" props={getImageProps(exact, { width: 512 })} />
        {/* Only 1x fits: the original still joins as 1.416x, and the 2000px resize is the src. */}
        <Case id="density_bail" props={getImageProps(large, { width: 2000 })} />
        <Case id="density_over" props={getImageProps(large, { width: 4000 })} />
        <Case id="density_no_intrinsic" props={getImageProps(nonImage, { width: 400 })} />

        {/* Width descriptors: no width or height is requested. */}
        <Case id="responsive_large" props={getImageProps(large, {})} />
        {/* The original is exactly the largest default width: the limit value. */}
        <Case id="responsive_exact" props={getImageProps(exact, {})} />
        {/* The original is narrower than every default width. */}
        <Case id="responsive_small" props={getImageProps(small, {})} />
        <Case id="responsive_no_intrinsic" props={getImageProps(nonImage, {})} />
        <Case id="responsive_eager" props={getImageProps(large, { loading: "eager" })} />
        <Case
          id="responsive_eager_sizes"
          props={getImageProps(large, { loading: "eager", sizes: ["50vw"] })}
        />
        <Case
          id="responsive_sizes"
          props={getImageProps(large, { sizes: ["(width >= 600px) 50vw", "100vw"] })}
        />
        <Case
          id="responsive_sizes_auto"
          props={getImageProps(large, { sizes: ["auto", "100vw"] })}
        />
        <Case id="responsive_srcset" props={getImageProps(large, { srcSet: [1200, 400, 800] })} />
        <Case id="responsive_srcset_empty" props={getImageProps(large, { srcSet: [] })} />
        <Case id="responsive_absolute" props={getImageProps(large, { absolute: true })} />

        {/* The file name carries a comma, which ends a candidate in a srcset unless it is escaped.
            The widths stay under the 300px original so that a candidate set is produced at all. */}
        <Case id="comma_escaping" props={getImageProps(comma, { srcSet: [200, 100] })} />

        {/* A non-default provider: every resize goes through getUrl arguments. */}
        <Case id="dam_responsive" props={getImageProps(damNode)} />
        <Case id="dam_density" props={getImageProps(damNode, { width: 400 })} />
        <Case id="dam_density_both" props={getImageProps(damNode, { width: 300, height: 300 })} />

        {/* <JImage>: the cases above cover every branch of the computed attributes; these prove
            they land on a real <img>, in the spellings a browser reads. */}

        {/* Responsive: `srcset` and `sizes` reach the DOM, and the omitted alt falls back to the
            image's own jcr:title. */}
        <div data-testid="jimage_responsive">
          <JImage src={large} />
        </div>

        {/* Fixed size: density descriptors, no `sizes`, and an empty alt that survives the title
            fallback. */}
        <div data-testid="jimage_fixed">
          <JImage src={large} alt="" width={400} />
        </div>

        <div data-testid="jimage_attributes">
          <JImage
            src={large}
            alt=""
            id="jimage-attributes"
            className="custom-class"
            loading="lazy"
          />
        </div>

        {/* A file with no jmix:image: neither dimension is rendered. */}
        <div data-testid="jimage_no_dimensions">
          <JImage src={nonImage} alt="" />
        </div>
      </>
    );
  },
);
