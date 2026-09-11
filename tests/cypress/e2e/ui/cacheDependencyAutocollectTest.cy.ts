import { addNode, deleteNode, publishAndWaitJobEnding } from "@jahia/cypress";
import { addSimplePage } from "../../utils/helpers";
import { GENERIC_SITE_KEY, JAHIA_CONTEXT } from "../../support/constants";

describe("Cache dependencies collected by the URL builder", () => {
  const PAGE = "testAutocollectedCacheDependency";
  const FILES = `/sites/${GENERIC_SITE_KEY}/files`;
  const IMAGE = "autocollected.jpg";
  const RENAMED = "autocollected-renamed.jpg";
  const LIVE_PAGE = `/cms/render/live/en/sites/${GENERIC_SITE_KEY}/home/${PAGE}.html`;

  /** Renders LIVE_PAGE as an anonymous visitor */
  const renderLive = () =>
    cy
      .clearCookies()
      .request({ url: LIVE_PAGE })
      .then((response) => {
        expect(response.status, "the page must render for this test to mean anything").to.eq(200);
        return response.body as string;
      });

  const renderedAt = (html: string, testId: string) =>
    new RegExp(`${testId}_rendered_at">(\\d+)`).exec(html)?.[1];
  const imageSrc = (html: string, testId: string) =>
    new RegExp(`${testId}"><img src="([^"]+)"`).exec(html)?.[1];

  const addImageReference = (name: string, mixins: string[], properties = []) =>
    addNode({
      parentPathOrId: `/sites/${GENERIC_SITE_KEY}/home/${PAGE}/pagecontent`,
      name,
      primaryNodeType: "javascriptExample:testAutocollectedCacheDependency",
      mixins,
      properties: [
        { name: "image", value: `${FILES}/${IMAGE}`, type: "WEAKREFERENCE" },
        ...properties,
      ],
    });

  before("Create the page, the image and the two contents referencing it", () => {
    cy.fixture("testData/image.jpg", "binary").then((content) => {
      const blob = Cypress.Blob.binaryStringToBlob(content, "image/jpeg");
      cy.apollo({
        variables: {
          path: FILES,
          name: IMAGE,
          mimeType: "image/jpeg",
          file: new File([blob], IMAGE, { type: blob.type }),
        },
        mutationFile: "graphql/jcrUploadFile.graphql",
      });
    });

    addSimplePage(`/sites/${GENERIC_SITE_KEY}/home`, PAGE, PAGE, "en", "simple", [
      { name: "pagecontent", primaryNodeType: "jnt:contentList" },
    ]).then(() => {
      addImageReference("autocollected", []);
      addImageReference(
        "optedOut",
        ["jmix:renderable"],
        [{ name: "j:view", value: "noautocollect", type: "STRING" }],
      );
    });

    publishAndWaitJobEnding(`/sites/${GENERIC_SITE_KEY}`);
  });

  after("Clean", () => {
    deleteNode(`${FILES}/${RENAMED}`);
    deleteNode(`/sites/${GENERIC_SITE_KEY}/home/${PAGE}`);
    publishAndWaitJobEnding(`/sites/${GENERIC_SITE_KEY}`);
  });

  it("flushes the view that built the URL, and leaves the one that opted out", () => {
    renderLive().then((first) => {
      expect(imageSrc(first, "autocollected")).to.include(`/files/live${FILES}/${IMAGE}`);
      expect(imageSrc(first, "optedout")).to.include(`/files/live${FILES}/${IMAGE}`);

      // Liveness: without cached fragments there is nothing for the rename to flush, and every
      // assertion below would pass on a page that is simply rendered afresh every time.
      renderLive().then((second) => {
        expect(renderedAt(second, "autocollected"), "the fragment must be cached").to.eq(
          renderedAt(first, "autocollected"),
        );
        expect(renderedAt(second, "optedout"), "the fragment must be cached").to.eq(
          renderedAt(first, "optedout"),
        );

        cy.apollo({
          mutationFile: "graphql/jcrRenameNode.graphql",
          variables: {
            pathOrId: `${FILES}/${IMAGE}`,
            destParentPathOrId: FILES,
            destName: RENAMED,
          },
        });
        publishAndWaitJobEnding(FILES);

        // Liveness: the rename has to have reached live, or "the opted-out view did not change"
        // would pass simply because nothing happened at all.
        cy.request(`${JAHIA_CONTEXT}/files/live${FILES}/${RENAMED}`)
          .its("status")
          .should("eq", 200);

        renderLive().then((third) => {
          expect(
            renderedAt(third, "autocollected"),
            "the collected view must be flushed",
          ).to.not.eq(renderedAt(first, "autocollected"));
          expect(imageSrc(third, "autocollected")).to.include(`/files/live${FILES}/${RENAMED}`);

          expect(renderedAt(third, "optedout"), "the opted-out view must be untouched").to.eq(
            renderedAt(first, "optedout"),
          );
          expect(imageSrc(third, "optedout")).to.include(`/files/live${FILES}/${IMAGE}`);
        });
      });
    });
  });
});
