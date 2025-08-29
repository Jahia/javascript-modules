import { addNode, deleteNode } from "@jahia/cypress";
import { addSimplePage } from "../../utils/helpers";
import { GENERIC_SITE_KEY } from '../../support/constants';
import "cypress-wait-until";

describe("Test priority parameter on views", () => {
  const pageName = "testPriorityViewPage";
  const examples = [
    { nodeType: "javascriptExample:testPriorityView1", expectedPriority: 6 },
    { nodeType: "javascriptExample:testPriorityView2", expectedPriority: -3 },
    { nodeType: "javascriptExample:testPriorityView3", expectedPriority: 0 },
    { nodeType: "javascriptExample:testPriorityView4", expectedPriority: 13 },
  ];

  beforeEach("Create test page before each test", () => {
    addSimplePage(`/sites/${GENERIC_SITE_KEY}`, pageName, "Test components priorities", "en", "simple", [
      {
        name: "pagecontent",
        primaryNodeType: "jnt:contentList",
      },
    ]);
    cy.login();
  });

  afterEach("Delete the test page after each test", () => {
    deleteNode(`/sites/${GENERIC_SITE_KEY}/${pageName}`);
      cy.logout();
  });

  examples.forEach(({ nodeType, expectedPriority }) => {
    it(`${nodeType}: GIVEN multiple views with different priorities WHEN resolving the view THEN the view with the highest priority (${expectedPriority}) is used`, () => {
      addNode({
        parentPathOrId: `/sites/${GENERIC_SITE_KEY}/${pageName}/pagecontent`,
        name: "testPriority",
        primaryNodeType: nodeType,
      });
      cy.visit(`/jahia/jcontent/${GENERIC_SITE_KEY}/en/pages/${pageName}`);
      cy.iframe("#page-builder-frame-1").within(() => {
        cy.get('div[data-testid="testPriorityView"] span[data-testid="priorityValue"]').should(
          "have.text",
          expectedPriority,
        );
      });
    });
  });
});
