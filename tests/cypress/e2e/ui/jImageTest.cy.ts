import { addNode, deleteNode } from "@jahia/cypress";
import { addSimplePage } from "../../utils/helpers";
import { GENERIC_SITE_KEY, JAHIA_CONTEXT, JAHIA_ORIGIN } from "../../support/constants";

/** Intrinsic size of `testData/image.jpg`, which Jahia stores as `j:width` / `j:height`. */
const INTRINSIC_WIDTH = 2832;
const INTRINSIC_HEIGHT = 4240;

/** The image's own title, which an omitted `alt` falls back to. */
const IMAGE_TITLE = "A portrait photograph";

const FILES = `/sites/${GENERIC_SITE_KEY}/files`;
const IMAGE_PATH = `${FILES}/jimage.jpg`;
const NON_IMAGE_PATH = `${FILES}/jimage-notes.txt`;
const PAGE_PATH = `/sites/${GENERIC_SITE_KEY}/home/testImage`;

const img = (testId: string) => cy.get(`div[data-testid="${testId}"] img`);

describe("Test on JImage", () => {
  before("Create the image, the page and the content", () => {
    cy.fixture("testData/image.jpg", "binary").then((image) => {
      const blob = Cypress.Blob.binaryStringToBlob(image, "image/jpeg");
      cy.apollo({
        mutationFile: "graphql/jcrUploadFile.graphql",
        variables: {
          path: FILES,
          name: "jimage.jpg",
          mimeType: "image/jpeg",
          file: new File([blob], "jimage.jpg", { type: blob.type }),
        },
      });
    });

    // The title is what an omitted `alt` falls back to, so the suite sets it rather than
    // depending on whatever the upload left behind.
    cy.apollo({
      mutationFile: "graphql/setProperties.graphql",
      variables: {
        pathOrId: IMAGE_PATH,
        properties: [{ name: "jcr:title", value: IMAGE_TITLE, language: "en" }],
      },
    });

    // A file Jahia does not treat as an image: it carries no j:width / j:height.
    const notes = new Blob(["JImage: a file with no intrinsic dimensions."], {
      type: "text/plain",
    });
    cy.apollo({
      mutationFile: "graphql/jcrUploadFile.graphql",
      variables: {
        path: FILES,
        name: "jimage-notes.txt",
        mimeType: "text/plain",
        file: new File([notes], "jimage-notes.txt", { type: "text/plain" }),
      },
    });

    addSimplePage(`/sites/${GENERIC_SITE_KEY}/home`, "testImage", "testImage", "en", "simple", [
      { name: "pagecontent", primaryNodeType: "jnt:contentList" },
    ]).then(() => {
      addNode({
        parentPathOrId: `${PAGE_PATH}/pagecontent`,
        name: "test",
        primaryNodeType: "javascriptExample:testImage",
        properties: [
          { name: "image", value: IMAGE_PATH, type: "WEAKREFERENCE" },
          { name: "nonImage", value: NON_IMAGE_PATH, type: "WEAKREFERENCE" },
        ],
      });
    });
  });

  after("Clean", () => {
    deleteNode(PAGE_PATH);
    deleteNode(IMAGE_PATH);
    deleteNode(NON_IMAGE_PATH);
  });

  beforeEach(() => {
    cy.login();
    cy.visit(`/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/testImage.html`);
    // Both references must resolve, or every assertion below would pass vacuously on an
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
    cy.get('div[data-testid="jimage_absolute_og_image"] span')
      .should("have.attr", "data-url")
      .and("equal", `${JAHIA_ORIGIN}${JAHIA_CONTEXT}/files/default${IMAGE_PATH}`);
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
