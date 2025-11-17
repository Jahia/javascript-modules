import { addNode } from "@jahia/cypress";
import { addSimplePage } from "../../utils/helpers";
import { GENERIC_SITE_KEY } from '../../support/constants';

describe("Test has permission", () => {
  before("Create test contents", () => {
    addSimplePage(
      `/sites/${GENERIC_SITE_KEY}/home`,
      "testHasPermission",
      "Test has permission",
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
        parentPathOrId: `/sites/${GENERIC_SITE_KEY}/home/testHasPermission/pagecontent`,
        name: "test",
        primaryNodeType: "javascriptExample:testHasPermission",
      });
    });
  });

  beforeEach('Login', () => { cy.login(); });
  afterEach('Logout', () => { cy.logout(); });

  it("should display the permission", () => {
    cy.visit(`/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/testHasPermission.html`);
    cy.get('div[data-testid="currentNode_hasPermission"]').should("exist").contains("true");
    cy.get('div[data-testid="currentNode_hasNotPermission"]').should("exist").contains("false");
  });
});
