import { addNode, deleteNode } from "@jahia/cypress";
import { addSimplePage } from "../../utils/helpers";
import { GENERIC_SITE_KEY, JAHIA_CONTEXT, JAHIA_ORIGIN } from "../../support/constants";
import {
  DEFAULT_SRCSET,
  descriptors,
  IMAGES,
  setTitle,
  uploadImage,
  uploadText,
  uploadVector,
} from "../../utils/imageFixtures";

/**
 * What reaches the DOM. The branch-by-branch coverage of the computed attributes lives in
 * `getImagePropsTest.cy.ts`; this suite proves `<JImage>` renders them onto a real `<img>`, in the
 * attribute spellings a browser understands.
 */

/** Intrinsic size of `testData/image.jpg`, which Jahia stores as `j:width` / `j:height`. */
const INTRINSIC_WIDTH = IMAGES.large.width;
const INTRINSIC_HEIGHT = IMAGES.large.height;

/** The image's own title, which an omitted `alt` falls back to. */
const IMAGE_TITLE = "A portrait photograph";

const FILES = `/sites/${GENERIC_SITE_KEY}/files`;
const IMAGE_PATH = `${FILES}/jimage.jpg`;
const SMALL_PATH = `${FILES}/jimage-small.jpg`;
const VECTOR_PATH = `${FILES}/jimage-vector.svg`;
const NON_IMAGE_PATH = `${FILES}/jimage-notes.txt`;
const PAGE_PATH = `/sites/${GENERIC_SITE_KEY}/home/testImage`;

const img = (testId: string) => cy.get(`div[data-testid="${testId}"] img`);

/** Reads one attribute off the rendered `<img>`. */
const attr = (testId: string, name: string) => img(testId).invoke("attr", name);

describe("Test on JImage", () => {
  before("Create the images, the page and the content", () => {
    uploadImage(FILES, "jimage.jpg", IMAGES.large.file);
    uploadImage(FILES, "jimage-small.jpg", IMAGES.small.file);
    uploadVector(FILES, "jimage-vector.svg");

    // The title is what an omitted `alt` falls back to, so the suite sets it rather than
    // depending on whatever the upload left behind.
    setTitle(IMAGE_PATH, IMAGE_TITLE);

    // A file Jahia does not treat as an image: it carries no j:width / j:height.
    uploadText(
      FILES,
      "jimage-notes.txt",
      "JImage: a file with no intrinsic dimensions.",
      "text/plain",
    );

    addSimplePage(`/sites/${GENERIC_SITE_KEY}/home`, "testImage", "testImage", "en", "simple", [
      { name: "pagecontent", primaryNodeType: "jnt:contentList" },
    ]).then(() => {
      addNode({
        parentPathOrId: `${PAGE_PATH}/pagecontent`,
        name: "test",
        primaryNodeType: "javascriptExample:testImage",
        properties: [
          { name: "image", value: IMAGE_PATH, type: "WEAKREFERENCE" },
          { name: "smallImage", value: SMALL_PATH, type: "WEAKREFERENCE" },
          { name: "vectorImage", value: VECTOR_PATH, type: "WEAKREFERENCE" },
          { name: "nonImage", value: NON_IMAGE_PATH, type: "WEAKREFERENCE" },
        ],
      });
    });
  });

  after("Clean", () => {
    deleteNode(PAGE_PATH);
    for (const path of [IMAGE_PATH, SMALL_PATH, VECTOR_PATH, NON_IMAGE_PATH]) {
      deleteNode(path);
    }
  });

  beforeEach(() => {
    cy.login();
    cy.visit(`/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/testImage.html`);
    // Every reference must resolve, or every assertion below would pass vacuously on an
    // element that was never rendered.
    cy.get('div[data-testid="jimage_missing_fixture"]').should("not.exist");
  });

  afterEach(() => {
    cy.logout();
  });

  it("renders the image URL and its intrinsic size", () => {
    img("jimage_title")
      .should("have.attr", "src")
      .and("include", `${JAHIA_CONTEXT}/files/default${IMAGE_PATH}`);
    img("jimage_title").should("have.attr", "width", String(INTRINSIC_WIDTH));
    img("jimage_title").should("have.attr", "height", String(INTRINSIC_HEIGHT));
  });

  it("falls back to the image's title when alt is omitted", () => {
    img("jimage_title").should("have.attr", "alt", IMAGE_TITLE);
  });

  it("prefers an explicit alt over the title", () => {
    img("jimage_alt").should("have.attr", "alt", "Explicit alt");
  });

  it("keeps an empty alt for a decorative image", () => {
    // The title must not come back: `alt=""` is a decision, not an omission.
    img("jimage_decorative").should("have.attr", "alt", "");
  });

  it("derives the height from a requested width, preserving the aspect ratio", () => {
    img("jimage_width").should("have.attr", "width", "400");
    img("jimage_width").should("have.attr", "height", "599");
  });

  it("derives the width from a requested height, preserving the aspect ratio", () => {
    img("jimage_height").should("have.attr", "width", "401");
    img("jimage_height").should("have.attr", "height", "600");
  });

  it("keeps both dimensions when both are requested", () => {
    img("jimage_both").should("have.attr", "width", "300");
    img("jimage_both").should("have.attr", "height", "300");
  });

  it("offers density descriptors for a fixed-size image", () => {
    // A fixed-size image is picked by pixel density, so it carries no `sizes`.
    attr("jimage_width", "srcset").then((srcSet) => {
      expect(descriptors(srcSet as string)).to.deep.equal(["4.0x", "3.0x", "2.0x", "1.5x", "1.0x"]);
    });
    img("jimage_width").should("not.have.attr", "sizes");
  });

  it("renders the candidate set and its sizes on a responsive image", () => {
    attr("jimage_srcset", "srcset").then((srcSet) => {
      expect(descriptors(srcSet as string)).to.deep.equal(DEFAULT_SRCSET.map((w) => `${w}w`));
    });
    // `auto` is the laid-out width, `100vw` the fallback for browsers without it.
    img("jimage_srcset").should("have.attr", "sizes", "auto, 100vw");
    img("jimage_srcset").should("have.attr", "loading", "lazy");
  });

  it("drops auto from the sizes of an eager image", () => {
    // `auto` is only valid on a lazily loaded image.
    img("jimage_eager").should("have.attr", "loading", "eager");
    img("jimage_eager").should("have.attr", "sizes", "100vw");
  });

  it("renders caller-supplied sizes behind auto", () => {
    img("jimage_custom_sizes").should("have.attr", "sizes", "auto, (width >= 600px) 50vw, 100vw");
  });

  it("renders caller-supplied widths, largest first", () => {
    attr("jimage_custom_srcset", "srcset").then((srcSet) => {
      expect(descriptors(srcSet as string)).to.deep.equal(["1200w", "800w", "400w"]);
    });
  });

  it("offers no candidate set for an image narrower than every default width", () => {
    // One candidate is not a choice, so neither attribute is worth rendering.
    img("jimage_small").should("not.have.attr", "srcset");
    img("jimage_small").should("not.have.attr", "sizes");
    img("jimage_small").should("have.attr", "width", String(IMAGES.small.width));
    img("jimage_small").should("have.attr", "height", String(IMAGES.small.height));
  });

  it("serves a vector image whole", () => {
    img("jimage_vector").should("have.attr", "src").and("include", VECTOR_PATH);
    img("jimage_vector").should("not.have.attr", "srcset");
    img("jimage_vector").should("not.have.attr", "sizes");
  });

  it("passes every other attribute through to the img", () => {
    img("jimage_attributes").should("have.attr", "id", "jimage-attributes");
    img("jimage_attributes").should("have.class", "custom-class");
    img("jimage_attributes").should("have.attr", "loading", "lazy");
    // The computed src survives the passthrough.
    img("jimage_attributes")
      .should("have.attr", "src")
      .and("include", `${JAHIA_CONTEXT}/files/default${IMAGE_PATH}`);
  });

  it("exposes an absolute URL for an og:image, through the props tier", () => {
    // The sink `absolute` exists for. <JImage> hides it, so this goes through getImageProps.
    //
    // A scraper cannot read a candidate set, so it gets `src` — today the smallest candidate,
    // which is the wrong image to hand a social card. Whether this case belongs to getImageProps
    // at all, or to a plain buildNodeUrl, is still open; until it is settled this asserts what
    // the props tier actually returns.
    cy.get('div[data-testid="jimage_absolute_og_image"] span')
      .should("have.attr", "data-url")
      .and("include", `${JAHIA_ORIGIN}${JAHIA_CONTEXT}/files/default${IMAGE_PATH}`)
      .and("include", `w=${DEFAULT_SRCSET.at(-1)}`);
  });

  it("states no dimension for a file that has none", () => {
    // Half a pair would be worse than none: it asserts an aspect ratio the file contradicts.
    img("jimage_no_dimensions")
      .should("have.attr", "src")
      .and("include", `${JAHIA_CONTEXT}/files/default${NON_IMAGE_PATH}`);
    img("jimage_no_dimensions").should("not.have.attr", "width");
    img("jimage_no_dimensions").should("not.have.attr", "height");
  });
});
