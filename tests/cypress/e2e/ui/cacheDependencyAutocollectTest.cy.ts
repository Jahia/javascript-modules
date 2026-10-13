import { addNode, deleteNode, publishAndWaitJobEnding } from "@jahia/cypress";
import { addSimplePage } from "../../utils/helpers";
import { GENERIC_SITE_KEY } from "../../support/constants";

describe("Cache dependencies collected by the URL builder", () => {
  const PAGE = "testAutocollectedCacheDependency";
  const FILES = `/sites/${GENERIC_SITE_KEY}/files`;
  const IMAGE = "autocollected.jpg";
  const RENAMED = "autocollected-renamed.jpg";
  const LIVE_PAGE = `/cms/render/live/en/sites/${GENERIC_SITE_KEY}/home/${PAGE}.html`;
  /** The test ids of the views whose dependency is collected */
  const COLLECTED = ["autocollected", "explicitcontext"];
  /** The test ids of the views that opted out, for the whole view or for one call */
  const OPTED_OUT = ["optedout", "callopout"];

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

  before("Create the page, the image and the contents referencing it", () => {
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
      addImageReference(
        "explicitContext",
        ["jmix:renderable"],
        [{ name: "j:view", value: "explicitcontext", type: "STRING" }],
      );
      addImageReference(
        "callOptOut",
        ["jmix:renderable"],
        [{ name: "j:view", value: "callopout", type: "STRING" }],
      );
    });

    publishAndWaitJobEnding(`/sites/${GENERIC_SITE_KEY}`);
  });

  after("Clean", () => {
    deleteNode(`${FILES}/${RENAMED}`);
    deleteNode(`/sites/${GENERIC_SITE_KEY}/home/${PAGE}`);
    publishAndWaitJobEnding(`/sites/${GENERIC_SITE_KEY}`);
  });

  it("flushes the views that built the URL, and leaves the ones that opted out", () => {
    renderLive().then((first) => {
      for (const view of [...COLLECTED, ...OPTED_OUT]) {
        expect(imageSrc(first, view), view).to.include(`/files/live${FILES}/${IMAGE}`);
      }

      // Liveness: without cached fragments there is nothing for the rename to flush, and every
      // assertion below would pass on a page that is simply rendered afresh every time.
      renderLive().then((second) => {
        for (const view of [...COLLECTED, ...OPTED_OUT]) {
          expect(renderedAt(second, view), `the ${view} fragment must be cached`).to.eq(
            renderedAt(first, view),
          );
        }

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
        // The URL is relative: Cypress appends it to `baseUrl`, which already carries the
        // servlet context path. Prefixing JAHIA_CONTEXT here would double it.
        cy.request(`/files/live${FILES}/${RENAMED}`).its("status").should("eq", 200);

        renderLive().then((third) => {
          for (const view of COLLECTED) {
            expect(renderedAt(third, view), `the ${view} view must be flushed`).to.not.eq(
              renderedAt(first, view),
            );
            expect(imageSrc(third, view), view).to.include(`/files/live${FILES}/${RENAMED}`);
          }

          for (const view of OPTED_OUT) {
            expect(renderedAt(third, view), `the ${view} view must be untouched`).to.eq(
              renderedAt(first, view),
            );
            expect(imageSrc(third, view), view).to.include(`/files/live${FILES}/${IMAGE}`);
          }
        });
      });
    });
  });
});
