import { addNode } from "@jahia/cypress";
import { GENERIC_SITE_KEY } from "../../support/constants";
import { addSimplePage } from "../../utils/helpers";

describe("Test current user", () => {
  before("Create tests contents", () => {
    addSimplePage(
      `/sites/${GENERIC_SITE_KEY}/home`,
      "testCurrentUser",
      "Test current user",
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
        parentPathOrId: `/sites/${GENERIC_SITE_KEY}/home/testCurrentUser/pagecontent`,
        name: "test",
        primaryNodeType: "javascriptExample:testCurrentUser",
      });
    });
  });

  beforeEach("Login", () => {
    cy.login();
  });
  afterEach("Logout", () => {
    cy.logout();
  });

  it("should display the current user as root", () => {
    cy.visit(`/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/testCurrentUser.html`);
    cy.get("div[data-testid=\"currentUser_username\"]").should("exist").contains("root");
    cy.get("div[data-testid=\"currentUser_isRoot\"]").should("exist").contains("true");
  });
});
