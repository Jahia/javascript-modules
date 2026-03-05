import { addNode } from "@jahia/cypress";
import { GENERIC_SITE_KEY } from "../../support/constants";
import { addSimplePage } from "../../utils/helpers";

describe("Test url parameters", () => {
  before("Create tests contents", () => {
    addSimplePage(
      `/sites/${GENERIC_SITE_KEY}/home`,
      "testUrlParameters",
      "Test url parameters",
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
        parentPathOrId: `/sites/${GENERIC_SITE_KEY}/home/testUrlParameters/pagecontent`,
        name: "test",
        primaryNodeType: "javascriptExample:testUrlParameters",
      });
    });
  });

  beforeEach("Login", () => {
    cy.login();
  });
  afterEach("Logout", () => {
    cy.logout();
  });

  it("should display the url parameters", () => {
    cy.visit(
      `/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/testUrlParameters.html?test=root`,
    );
    cy.get("div[data-testid=\"renderContext_urlParameters\"]").should("exist").contains("root");
  });

  it("should display the url parameters with special chars", () => {
    const param = "(root,user,:./\" \\)";
    cy.visit(
      `/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/testUrlParameters.html?test=` + param,
    );
    cy.get("div[data-testid=\"renderContext_urlParameters\"]").should("exist").contains(param);
  });
});
