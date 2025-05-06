import { addNode, publishAndWaitJobEnding } from "@jahia/cypress";
import { addSimplePage } from "../../utils/Utils";

describe("Verify client side component are rehydrated as expected", () => {
  before("Create test contents", () => {
    addSimplePage(
      "/sites/javascriptTestSite/home",
      "testHydrateInBrowser",
      "Test HydrateInBrowser",
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
        parentPathOrId: "/sites/javascriptTestSite/home/testHydrateInBrowser/pagecontent",
        name: "test",
        primaryNodeType: "javascriptExample:testReactClientSide",
      });
    });
    publishAndWaitJobEnding("/sites/javascriptTestSite/home/testHydrateInBrowser");
  });

  beforeEach("Login and visit", () => cy.login());
  for (const workspace of ["default", "live"]) {
    it(`${workspace}: Check that components is hydrated correctly`, () => {
      cy.visit(
        `/cms/render/${workspace}/en/sites/javascriptTestSite/home/testHydrateInBrowser.html`,
      );
      // Check <InBrowser> children
      cy.get('[data-testid="ssr-child"]').should("exist");
      cy.get('[data-testid="ssr-child"]').should("contain", "Server-side rendered");
      cy.get('[data-testid="ssr-placeholder"]').should("exist");
      cy.get('[data-testid="ssr-placeholder"]').should("contain", "Server-side placeholder");

      cy.get('p[data-testid="count"]').should("exist");
      cy.get('p[data-testid="count"]').should("contain", "Count: 9");
      cy.get('p[data-testid="set"]').should("contain", "Set: a, b, c");

      // Wait for the component to be declared as hydrated to avoid flakiness
      cy.get('[data-hydrated="true"]').should("exist");

      // Check that CSR place holder is removed after hydration
      cy.get('[data-testid="ssr-placeholder"]').should("not.exist");

      cy.get('button[data-testid="count-button"]').click();
      cy.get('button[data-testid="count-button"]').click();
      cy.get('p[data-testid="count"]').should("contain", "Count: 11");

      cy.get('span[data-testid="path"]').should("exist");
      cy.get('span[data-testid="path"]').should(
        "contain",
        "/sites/javascriptTestSite/home/testHydrateInBrowser/pagecontent/test",
      );
      cy.get('span[data-testid="counter"]').should("exist");
      cy.get('span[data-testid="counter"]').should("not.contain", "0");
      cy.get('span[data-testid="counter"]').should("contain", "0");

      cy.get('[data-testid="ssr-child"]').should("contain", "Server-side rendered");
    });
  }

  afterEach("Logout", () => cy.logout());
});
