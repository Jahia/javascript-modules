import { addNode, deleteNode, publishAndWaitJobEnding } from "@jahia/cypress";
import { addSimplePage } from "../../utils/helpers";
import { GENERIC_SITE_KEY } from "../../support/constants";

/**
 * `addCacheDependency({ uuid })` is the one key form a view can register for a reference it could
 * not resolve. The tag reads its page context in `setUuid`, so it only works if the engine sets the
 * context before it populates the attributes.
 */
describe("Cache dependency declared by uuid", () => {
  const HOME = `/sites/${GENERIC_SITE_KEY}/home`;
  const PAGE = "testUuidCacheDependency";
  const TARGET = "testUuidCacheDependencyTarget";
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

  const renderedAt = (html: string) => /uuid_dependency_rendered_at">(\d+)/.exec(html)?.[1];
  const title = (html: string) => /uuid_dependency_title">([^<]*)</.exec(html)?.[1];

  before("Create the target page and the page depending on it", () => {
    addSimplePage(HOME, TARGET, "Before", "en", "simple");
    addSimplePage(HOME, PAGE, PAGE, "en", "simple", [
      { name: "pagecontent", primaryNodeType: "jnt:contentList" },
    ]).then(() => {
      addNode({
        parentPathOrId: `${HOME}/${PAGE}/pagecontent`,
        name: "test",
        primaryNodeType: "javascriptExample:testUuidCacheDependency",
        properties: [{ name: "targetPath", value: `${HOME}/${TARGET}`, type: "STRING" }],
      });
    });
    publishAndWaitJobEnding(`/sites/${GENERIC_SITE_KEY}`);
  });

  after("Clean", () => {
    deleteNode(`${HOME}/${PAGE}`);
    deleteNode(`${HOME}/${TARGET}`);
    publishAndWaitJobEnding(`/sites/${GENERIC_SITE_KEY}`);
  });

  it("flushes the fragment when the target is published again", () => {
    renderLive().then((first) => {
      expect(title(first)).to.eq("Before");

      // Liveness: without a cached fragment there is nothing for the publication to flush, and
      // the assertion below would pass on a page that is simply rendered afresh every time.
      renderLive().then((second) => {
        expect(renderedAt(second), "the fragment must be cached").to.eq(renderedAt(first));

        cy.apollo({
          mutationFile: "graphql/setProperties.graphql",
          variables: {
            pathOrId: `${HOME}/${TARGET}`,
            properties: [{ name: "jcr:title", value: "After", language: "en" }],
          },
        });
        publishAndWaitJobEnding(`${HOME}/${TARGET}`);

        renderLive().then((third) => {
          expect(renderedAt(third), "the fragment must be flushed").to.not.eq(renderedAt(first));
          expect(title(third)).to.eq("After");
        });
      });
    });
  });
});
