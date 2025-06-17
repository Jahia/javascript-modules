import { addNode, deleteNode, publishAndWaitJobEnding } from "@jahia/cypress";
import { addSimplePage } from "../../utils/helpers";
import { GENERIC_SITE_KEY } from '../../support/constants';

describe("Verify that the legacy/deprecated registration behaves as expected", () => {
  beforeEach("Create test data", () => {
    addSimplePage(
      `/sites/${GENERIC_SITE_KEY}/home`,
      "testRegisterLegacyJahiaComponents",
      "Test registerLegacyJahiaComponents",
      "en",
      "simple",
      [
        {
          name: "pagecontent",
          primaryNodeType: "jnt:contentList",
        },
      ],
    ).then(() => {
      publishAndWaitJobEnding(`/sites/${GENERIC_SITE_KEY}/home/testRegisterLegacyJahiaComponents`);
    });
  });

  afterEach("Cleanup data", () => {
    deleteNode(`/sites/${GENERIC_SITE_KEY}/home/testRegisterLegacyJahiaComponents`);
    publishAndWaitJobEnding(`/sites/${GENERIC_SITE_KEY}/home`);
  });

  it("Test minimum legacy registration of Jahia components", () => {
    addNode({
      parentPathOrId:
        `/sites/${GENERIC_SITE_KEY}/home/testRegisterLegacyJahiaComponents/pagecontent`,
      name: "test-legacy-registration-minimal",
      primaryNodeType: "javascriptExample:testLegacyRegistrationMinimal",
    }).then(() => {
      publishAndWaitJobEnding(`/sites/${GENERIC_SITE_KEY}/home/testRegisterLegacyJahiaComponents`);
      cy.visit(`/sites/${GENERIC_SITE_KEY}/home/testRegisterLegacyJahiaComponents.html`);
      cy.get('div[data-testid="legacyRegistrationMinimal"]').contains(
        "javascriptExample:testLegacyRegistrationMinimal view component",
      );
    });
  });

  it("Test advanced legacy registration of Jahia components", () => {
    addNode({
      parentPathOrId:
        `/sites/${GENERIC_SITE_KEY}/home/testRegisterLegacyJahiaComponents/pagecontent`,
      name: "testLegacyRegistrationAdvanced",
      primaryNodeType: "javascriptExample:testLegacyRegistrationAdvanced",
      mixins: ["jmix:renderable"],
      properties: [
        { name: "j:view", value: "legacyRegistrationAdvancedName" },
        { name: "myProp", value: "my value" },
      ],
    }).then(() => {
      publishAndWaitJobEnding(`/sites/${GENERIC_SITE_KEY}/home/testRegisterLegacyJahiaComponents`);
      cy.visit(`/sites/${GENERIC_SITE_KEY}/home/testRegisterLegacyJahiaComponents.html`);
      cy.get('div[data-testid="legacyRegistrationAdvanced"]').should("exist");
      cy.get(
        'div[data-testid="legacyRegistrationAdvanced"] span[data-testid="registryName"]',
      ).contains("legacyRegistrationAdvancedName");
      cy.get('div[data-testid="legacyRegistrationAdvanced"] span[data-testid="myProp"]').contains(
        "my value",
      );
    });
  });
});
