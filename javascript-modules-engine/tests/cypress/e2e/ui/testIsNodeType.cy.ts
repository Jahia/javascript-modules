import { addNode } from "@jahia/cypress";
import { addSimplePage } from "../../utils/helpers";
import { GENERIC_SITE_KEY } from '../../support/constants';

describe("test isNodeType", () => {
  before("Create test contents", () => {
    addSimplePage(
      `/sites/${GENERIC_SITE_KEY}/home`,
      "testIsNodeType",
      "Test isNodeType",
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
        parentPathOrId: `/sites/${GENERIC_SITE_KEY}/home/testIsNodeType/pagecontent`,
        name: "test",
        primaryNodeType: "javascriptExample:testIsNodeType",
      });
    });
  });

  beforeEach('Login', () => { cy.login(); });
  afterEach('Logout', () => { cy.logout(); });

  it("should display the node type", () => {
    cy.visit(`/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/testIsNodeType.html`);
    cy.get('div[data-testid="currentNode_isNodeType"]').should("exist").contains("true");
    cy.get('div[data-testid="currentNode_isNotNodeType"]').should("exist").contains("false");
  });
});
