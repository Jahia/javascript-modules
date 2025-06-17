import { addNode } from "@jahia/cypress";
import { addSimplePage } from "../../utils/helpers";
import { GENERIC_SITE_KEY } from '../../support/constants';

describe("Verify that registerJahiaComponents behaves as expected", () => {
  before("Create test contents", () => {
    addSimplePage(
      `/sites/${GENERIC_SITE_KEY}/home`,
      "testRegisterJahiaComponents",
      "Test registerJahiaComponents",
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
        parentPathOrId: `/sites/${GENERIC_SITE_KEY}/home/testRegisterJahiaComponents/pagecontent`,
        name: "test",
        primaryNodeType: "javascriptExample:testReactViewRegistration",
      });
    });
  });

  beforeEach("Login and visit", () => {
    cy.login();
    cy.visit(`/jahia/jcontent/${GENERIC_SITE_KEY}/en/pages/home/testRegisterJahiaComponents`);
  });

  afterEach("Logout", () => cy.logout());

  it("Check that components are properly registered", () => {
    cy.iframe("#page-builder-frame-1").within(() => {
      cy.get('div[data-testid="standardViewRegistration"]').should("exist");
      cy.get('div[data-testid="standardViewRegistration"]').contains("default");
      cy.get('div[data-testid="customViewRegistration"]').should("exist");
      cy.get('div[data-testid="customViewRegistration"]').contains("default");
      cy.get('div[data-testid="noRegistration"]').should("exist");
      cy.get('div[data-testid="noRegistration"]').contains("null");
    });
  });
});
