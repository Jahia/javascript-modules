import { addNode, deleteNode } from "@jahia/cypress";
import { addSimplePage } from "../../utils/helpers";
import { GENERIC_SITE_KEY, JAHIA_CONTEXT, JAHIA_ORIGIN } from "../../support/constants";
import {
  candidateUrls,
  DEFAULT_SRCSET,
  descriptors,
  IMAGES,
  setTitle,
  uploadImage,
  uploadText,
  uploadVector,
} from "../../utils/imageFixtures";

/**
 * `getImageProps` is the branch-heavy half of the image tier, and most of its branches turn on a
 * limit value: an intrinsic width exactly equal to a requested one, a density that lands exactly on
 * the original, a candidate list that empties. This suite reads the returned attributes directly,
 * case by case, rather than through the DOM — `jImageTest.cy.ts` covers the rendered `<img>`.
 */

/** The image's own title, which an omitted `alt` falls back to. */
const IMAGE_TITLE = "A portrait photograph";

const FILES = `/sites/${GENERIC_SITE_KEY}/files`;
const LARGE_PATH = `${FILES}/props-large.jpg`;
const EXACT_PATH = `${FILES}/props-exact.jpg`;
const SMALL_PATH = `${FILES}/props-small.jpg`;
/** A comma in the name is what `encodeComma` exists for: raw, it would end the candidate. */
const COMMA_NAME = "props-comma,name.jpg";
const COMMA_PATH = `${FILES}/${COMMA_NAME}`;
const VECTOR_PATH = `${FILES}/props-vector.svg`;
const NON_IMAGE_PATH = `${FILES}/props-notes.txt`;
const PAGE_PATH = `/sites/${GENERIC_SITE_KEY}/home/testImageProps`;

interface ImageProps {
  src: string;
  srcSet?: string;
  alt: string;
  width?: number;
  height?: number;
  loading: "eager" | "lazy";
  sizes?: string;
}

/** Reads back what `getImageProps` returned for one case. */
const props = (id: string) =>
  cy
    .get(`[data-testid="case_${id}"]`)
    .invoke("attr", "data-props")
    .then((raw) => JSON.parse(raw as string) as ImageProps);

describe("getImageProps", () => {
  before("Create the fixtures, the page and the content", () => {
    uploadImage(FILES, "props-large.jpg", IMAGES.large.file);
    uploadImage(FILES, "props-exact.jpg", IMAGES.exact.file);
    uploadImage(FILES, "props-small.jpg", IMAGES.small.file);
    uploadImage(FILES, COMMA_NAME, IMAGES.small.file);
    uploadVector(FILES, "props-vector.svg");
    uploadText(
      FILES,
      "props-notes.txt",
      "getImageProps: a file with no intrinsic dimensions.",
      "text/plain",
    );

    // The suite sets the title rather than depending on whatever the upload left behind.
    setTitle(LARGE_PATH, IMAGE_TITLE);

    addSimplePage(
      `/sites/${GENERIC_SITE_KEY}/home`,
      "testImageProps",
      "testImageProps",
      "en",
      "simple",
      [{ name: "pagecontent", primaryNodeType: "jnt:contentList" }],
    ).then(() => {
      addNode({
        parentPathOrId: `${PAGE_PATH}/pagecontent`,
        name: "test",
        primaryNodeType: "javascriptExample:testImageProps",
        properties: [
          { name: "largeImage", value: LARGE_PATH, type: "WEAKREFERENCE" },
          { name: "exactImage", value: EXACT_PATH, type: "WEAKREFERENCE" },
          { name: "smallImage", value: SMALL_PATH, type: "WEAKREFERENCE" },
          { name: "commaImage", value: COMMA_PATH, type: "WEAKREFERENCE" },
          { name: "vectorImage", value: VECTOR_PATH, type: "WEAKREFERENCE" },
          { name: "nonImage", value: NON_IMAGE_PATH, type: "WEAKREFERENCE" },
        ],
      });
    });
  });

  after("Clean", () => {
    deleteNode(PAGE_PATH);
    for (const path of [
      LARGE_PATH,
      EXACT_PATH,
      SMALL_PATH,
      COMMA_PATH,
      VECTOR_PATH,
      NON_IMAGE_PATH,
    ]) {
      deleteNode(path);
    }
  });

  beforeEach(() => {
    cy.login();
    cy.visit(`/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/testImageProps.html`);
    // Every reference must resolve, or the assertions below would pass on a case that was never
    // rendered.
    cy.get('[data-testid="imageprops_missing_fixture"]').should("not.exist");
  });

  afterEach(() => {
    cy.logout();
  });

  describe("vector images", () => {
    it("serves an SVG whole, with no candidate set", () => {
      props("vector").should((p) => {
        expect(p.src).to.include(`${JAHIA_CONTEXT}/files/default${VECTOR_PATH}`);
        // No resize parameter: the URL is the file itself.
        expect(p.src).not.to.include("w=");
        expect(p.srcSet).to.be.undefined;
        expect(p.sizes).to.be.undefined;
      });
    });

    it("keeps a requested width on an SVG", () => {
      props("vector_sized").should((p) => {
        expect(p.width).to.equal(100);
        expect(p.srcSet).to.be.undefined;
      });
    });
  });

  describe("alt", () => {
    it("falls back to the image's title", () => {
      props("alt_default").should((p) => expect(p.alt).to.equal(IMAGE_TITLE));
    });

    it("prefers an explicit alt", () => {
      props("alt_explicit").should((p) => expect(p.alt).to.equal("Explicit alt"));
    });

    it("keeps an empty alt for a decorative image", () => {
      // The title must not come back: `alt=""` is a decision, not an omission.
      props("alt_decorative").should((p) => expect(p.alt).to.equal(""));
    });
  });

  describe("unusable requested dimensions", () => {
    // A zero or negative width is discarded rather than turned into a `0x` or `-30.00x`
    // descriptor, which leaves the responsive branch to handle the image.
    for (const id of ["guard_zero", "guard_negative"]) {
      it(`ignores ${id.replace("guard_", "a ")} width`, () => {
        props(id).should((p) => {
          expect(p.width).to.equal(IMAGES.large.width);
          expect(descriptors(p.srcSet)).to.deep.equal(DEFAULT_SRCSET.map((w) => `${w}w`));
        });
      });
    }
  });

  describe("density descriptors", () => {
    it("offers 4x to 1x for a requested width, and derives the height", () => {
      props("density_width").should((p) => {
        expect(descriptors(p.srcSet)).to.deep.equal(["4.0x", "3.0x", "2.0x", "1.5x", "1.0x"]);
        expect(candidateUrls(p.srcSet)[0]).to.include("w=1600");
        expect(p.width).to.equal(400);
        // 400 / 2832 * 4240, rounded up.
        expect(p.height).to.equal(599);
        // `sizes` describes a width-descriptor set; it has no meaning next to `x` descriptors.
        expect(p.sizes).to.be.undefined;
      });
    });

    it("derives the width from a requested height", () => {
      props("density_height").should((p) => {
        expect(descriptors(p.srcSet)).to.deep.equal(["4.0x", "3.0x", "2.0x", "1.5x", "1.0x"]);
        expect(candidateUrls(p.srcSet)[0]).to.include("h=2400");
        expect(p.width).to.equal(401);
        expect(p.height).to.equal(600);
      });
    });

    it("keeps both dimensions when both are requested, preserving the requested ratio", () => {
      props("density_both").should((p) => {
        expect(p.width).to.equal(300);
        expect(p.height).to.equal(300);
        // The square the caller asked for is carried into every candidate.
        expect(candidateUrls(p.srcSet)[0]).to.include("w=1200").and.to.include("h=1200");
        expect(candidateUrls(p.srcSet).at(-1)).to.include("w=300").and.to.include("h=300");
      });
    });

    it("drops the densities that exceed the original", () => {
      // 4x and 3x of 1000 are past the 2832px original, so only 2x, 1.5x and 1x survive.
      props("density_clamped").should((p) => {
        expect(descriptors(p.srcSet)).to.deep.equal(["2.0x", "1.5x", "1.0x"]);
      });
    });

    it("keeps a density that lands exactly on the original", () => {
      // 4x of 512 is 2048, exactly the original: the boundary must be kept, not filtered out.
      props("density_exact").should((p) => {
        expect(descriptors(p.srcSet)).to.deep.equal(["4.0x", "3.0x", "2.0x", "1.5x", "1.0x"]);
        expect(candidateUrls(p.srcSet)[0]).to.include(`w=${IMAGES.exact.width}`);
      });
    });

    it("serves the original when only one density survives", () => {
      // 1.5x of 2000 is past the 2832px original, so there is nothing to choose between.
      props("density_bail").should((p) => {
        expect(p.srcSet).to.be.undefined;
        expect(p.src).not.to.include("w=");
        expect(p.width).to.equal(2000);
        expect(p.height).to.equal(2995);
      });
    });

    it("serves the original when the requested width exceeds it", () => {
      props("density_over").should((p) => {
        expect(p.srcSet).to.be.undefined;
        expect(p.width).to.equal(4000);
        expect(p.height).to.equal(5989);
      });
    });

    it("offers every density when the original's size is unknown", () => {
      props("density_no_intrinsic").should((p) => {
        expect(descriptors(p.srcSet)).to.deep.equal(["4.0x", "3.0x", "2.0x", "1.5x", "1.0x"]);
        expect(p.width).to.equal(400);
        // Half a pair would assert an aspect ratio the file does not support.
        expect(p.height).to.be.undefined;
      });
    });
  });

  describe("width descriptors", () => {
    it("caps the candidates at the largest default width", () => {
      props("responsive_large").should((p) => {
        expect(descriptors(p.srcSet)).to.deep.equal(DEFAULT_SRCSET.map((w) => `${w}w`));
        expect(p.width).to.equal(IMAGES.large.width);
        expect(p.height).to.equal(IMAGES.large.height);
        // The smallest candidate is the fallback for a browser that ignores `srcset`.
        expect(p.src).to.include(`w=${DEFAULT_SRCSET.at(-1)}`);
      });
    });

    it("offers an original that is exactly the largest default width", () => {
      // 2048 must appear once: neither dropped by the filter nor added twice by the prepend.
      props("responsive_exact").should((p) => {
        expect(descriptors(p.srcSet)).to.deep.equal(DEFAULT_SRCSET.map((w) => `${w}w`));
        expect(p.width).to.equal(IMAGES.exact.width);
      });
    });

    it("offers no candidate set for an original narrower than every default width", () => {
      // One candidate is not a choice, so neither `srcset` nor `sizes` is worth emitting.
      props("responsive_small").should((p) => {
        expect(p.srcSet).to.be.undefined;
        expect(p.sizes).to.be.undefined;
        expect(p.width).to.equal(IMAGES.small.width);
        expect(p.height).to.equal(IMAGES.small.height);
      });
    });

    it("offers every default width when the original's size is unknown", () => {
      props("responsive_no_intrinsic").should((p) => {
        expect(descriptors(p.srcSet)).to.deep.equal(DEFAULT_SRCSET.map((w) => `${w}w`));
        expect(p.width).to.be.undefined;
        expect(p.height).to.be.undefined;
      });
    });

    it("sorts caller-supplied widths from largest to smallest", () => {
      props("responsive_srcset").should((p) => {
        expect(descriptors(p.srcSet)).to.deep.equal(["1200w", "800w", "400w"]);
        expect(p.src).to.include("w=400");
      });
    });

    it("serves the original when the caller asks for no width at all", () => {
      props("responsive_srcset_empty").should((p) => {
        expect(p.srcSet).to.be.undefined;
        expect(p.src).not.to.include("w=");
        expect(p.width).to.equal(IMAGES.large.width);
      });
    });
  });

  describe("sizes", () => {
    it("defaults a lazy image to auto with a fallback", () => {
      // `auto` lets the browser use the laid-out width, and `100vw` covers the browsers that do
      // not support it yet.
      props("responsive_large").should((p) => expect(p.sizes).to.equal("auto, 100vw"));
    });

    it("defaults an eager image to 100vw", () => {
      // `auto` is only valid on a lazily loaded image.
      props("responsive_eager").should((p) => {
        expect(p.loading).to.equal("eager");
        expect(p.sizes).to.equal("100vw");
      });
    });

    it("passes an eager image's sizes through untouched", () => {
      // Nothing is prepended: `auto` would be invalid here, and the caller stated the layout.
      props("responsive_eager_sizes").should((p) => expect(p.sizes).to.equal("50vw"));
    });

    it("prefixes caller-supplied sizes with auto", () => {
      props("responsive_sizes").should((p) =>
        expect(p.sizes).to.equal("auto, (width >= 600px) 50vw, 100vw"),
      );
    });

    it("does not repeat an auto the caller already supplied", () => {
      props("responsive_sizes_auto").should((p) => expect(p.sizes).to.equal("auto, 100vw"));
    });
  });

  describe("absolute URLs", () => {
    it("prefixes every URL with the origin", () => {
      props("responsive_absolute").should((p) => {
        expect(p.src).to.include(`${JAHIA_ORIGIN}${JAHIA_CONTEXT}/files/default${LARGE_PATH}`);
        for (const url of candidateUrls(p.srcSet)) {
          expect(url).to.include(JAHIA_ORIGIN);
        }
      });
    });
  });

  describe("comma escaping", () => {
    it("percent-encodes the commas a srcset would otherwise split on", () => {
      // The file name contains a comma. Left raw it would end the candidate early, and the
      // browser would read the rest as a second, malformed URL.
      //
      // Jahia already encodes it on its way out of `node.getUrl`, in lower case, so the
      // assertion is on the invariant rather than on who enforced it: no candidate URL may
      // carry a raw comma. `encodeComma` is the backstop for the URL shapes Jahia leaves alone.
      props("comma_escaping").should((p) => {
        const urls = candidateUrls(p.srcSet);
        expect(urls).to.have.length(2);
        for (const url of urls) {
          expect(url.toUpperCase(), "the comma is in the name, encoded").to.include("%2C");
          expect(url, "a raw comma would split the candidate").not.to.include(",");
        }
      });
    });
  });
});
