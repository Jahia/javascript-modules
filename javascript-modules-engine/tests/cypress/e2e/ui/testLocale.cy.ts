import { addSimplePage } from "../../utils/Utils";
import { addNode } from "@jahia/cypress";

describe("Test locale", () => {
  before("Create tests contents", () => {
    addSimplePage("/sites/javascriptTestSite/home", "testLocale", "Test locale", "en", "simple", [
      {
        name: "pagecontent",
        primaryNodeType: "jnt:contentList",
      },
    ]).then(() => {
      addNode({
        parentPathOrId: "/sites/javascriptTestSite/home/testLocale/pagecontent",
        name: "test",
        primaryNodeType: "javascriptExample:testLocale",
      });
    });
  });

  it("should display the locale", () => {
    cy.login();
    cy.visit("/cms/render/default/en/sites/javascriptTestSite/home/testLocale.html");
    cy.get('div[test-shouldbeEn="true"]').each(($el) => {
      cy.wrap($el).should("exist").contains("en");
    });
    cy.logout();
  });
});
