import { deleteNode } from "@jahia/cypress";
import { addSimplePage } from "../../utils/helpers";
import { GENERIC_SITE_KEY } from '../../support/constants';
import "cypress-wait-until";

describe("Test priority parameter on templates", () => {
  const pageName = "testPriorityTemplatePage";
  const examples = [
    { template: "testPriorityTemplateExample1", expectedPriority: 9 },
    { template: "testPriorityTemplateExample2", expectedPriority: -5 },
    {
      template: "testPriorityTemplateExample3",
      mixin: "javascriptExampleMix:testPriorityTemplateMixin3",
      expectedPriority: 50,
    },
  ];

  beforeEach('Login', () => { cy.login(); });

  afterEach("Delete the test page after each test", () => {
    deleteNode(`/sites/${GENERIC_SITE_KEY}/${pageName}`);
    cy.logout();
  });

  examples.forEach(({ template, mixin, expectedPriority }) => {
    it(`${template}: GIVEN multiple templates with different priorities WHEN resolving the template THEN the template with the highest priority (${expectedPriority}) is used`, () => {
      addSimplePage(
        `/sites/${GENERIC_SITE_KEY}`,
        pageName,
        "Test priority template page",
        "en",
        template,
        [],
        mixin ? [mixin] : [],
      );
      cy.visit(`/jahia/jcontent/${GENERIC_SITE_KEY}/en/pages/${pageName}`);
      cy.iframe("#page-builder-frame-1").within(() => {
        cy.get('div[data-testid="testPriorityTemplate"] span[data-testid="priorityValue"]').should(
          "have.text",
          expectedPriority,
        );
      });
    });
  });
});
