import { deleteNode } from "@jahia/cypress";
import "cypress-wait-until";
import { addSimplePage } from "../../utils/Utils";

describe("Test priority parameter on templates", () => {
  const pageName = "testPriorityTemplatePage";
  const siteKey = "javascriptTestSite";
  const examples = [
    { template: "testPriorityTemplateExample1", expectedPriority: 9 },
    { template: "testPriorityTemplateExample2", expectedPriority: -5 },
    {
      template: "testPriorityTemplateExample3",
      mixin: "javascriptExampleMix:testPriorityTemplateMixin3",
      expectedPriority: 50,
    },
  ];

  afterEach("Delete the test page after each test", () => {
    deleteNode(`/sites/${siteKey}/${pageName}`);
  });

  examples.forEach(({ template, mixin, expectedPriority }) => {
    it(`${template}: GIVEN multiple templates with different priorities WHEN resolving the template THEN the template with the highest priority (${expectedPriority}) is used`, () => {
      addSimplePage(
        `/sites/${siteKey}`,
        pageName,
        "Test priority template page",
        "en",
        template,
        [],
        mixin ? [mixin] : [],
      );
      cy.login();
      cy.visit(`/jahia/jcontent/${siteKey}/en/pages/${pageName}`);
      cy.iframe("#page-builder-frame-1").within(() => {
        cy.get('div[data-testid="testPriorityTemplate"] span[data-testid="priorityValue"]').should(
          "have.text",
          expectedPriority,
        );
      });
      cy.logout();
    });
  });
});
