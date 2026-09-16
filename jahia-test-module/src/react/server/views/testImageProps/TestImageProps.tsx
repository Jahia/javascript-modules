import { getImageProps, jahiaComponent, type ImageProps } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";

/**
 * `getImageProps` is a pure function, but it only runs on GraalJS with a real `JCRNodeWrapper`, so
 * the suite exercises it here and asserts the returned attributes in `getImagePropsTest.cy.ts`. One
 * case per branch; the case id is what the spec looks up.
 */
const Case = ({ id, props }: { id: string; props: ImageProps }) => (
  <span data-testid={`case_${id}`} data-props={JSON.stringify(props)} />
);

jahiaComponent(
  {
    nodeType: "javascriptExample:testImageProps",
    name: "default",
    displayName: "test getImageProps",
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
      return <div data-testid="imageprops_missing_fixture">Every reference is required</div>;
    }

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
        {/* 4x and 3x exceed the 2832px original, so they are dropped. */}
        <Case id="density_clamped" props={getImageProps(large, { width: 1000 })} />
        {/* 4x is exactly the 2048px original: the limit value, which must be kept. */}
        <Case id="density_exact" props={getImageProps(exact, { width: 512 })} />
        {/* 1.5x exceeds the original, leaving one candidate: the original itself is served. */}
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
      </>
    );
  },
);
