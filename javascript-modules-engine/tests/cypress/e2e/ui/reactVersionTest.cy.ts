import { addNode, deleteNode, publishAndWaitJobEnding } from "@jahia/cypress";
import { addSimplePage } from "../../utils/helpers";
import { GENERIC_SITE_KEY } from '../../support/constants';

describe("Test React version", () => {
  before("Create test data", () => {
    addSimplePage(
      `/sites/${GENERIC_SITE_KEY}/home`,
      "testReactVersion",
      "testReactVersion",
      "en",
      "simple",
      [
        {
          name: "pagecontent",
          primaryNodeType: "jnt:contentList",
        },
      ],
    ).then(() => {
      addNode({
        parentPathOrId: `/sites/${GENERIC_SITE_KEY}/home/testReactVersion/pagecontent`,
        name: "test",
        primaryNodeType: "javascriptExample:testReactVersion",
      });
    });

    publishAndWaitJobEnding(`/sites/${GENERIC_SITE_KEY}`);
    cy.login();
  });

  after("Cleanup test data", () => {
    cy.logout();
    deleteNode(`/sites/${GENERIC_SITE_KEY}/home/testReactVersion`);
    publishAndWaitJobEnding(`/sites/GENERIC_SITE_KEY`);
  });

  it("React version should be correct", function () {
    cy.visit(`/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/testReactVersion.html`);
    cy.get('span[data-testid="react-version"]').should("have.text", "19.1.0");
    cy.get('span[data-testid="node-env"]').should("have.text", "production");
  });
});
