import { addNode } from "@jahia/cypress";
import { addSimplePage } from "../../utils/helpers";
import { GENERIC_SITE_KEY } from '../../support/constants';

describe("Test locale", () => {
  before("Create tests contents", () => {
    addSimplePage(`/sites/${GENERIC_SITE_KEY}/home`, "testLocale", "Test locale", "en", "simple", [
      {
        name: "pagecontent",
        primaryNodeType: "jnt:contentList",
      },
    ]).then(() => {
      addNode({
        parentPathOrId: `/sites/${GENERIC_SITE_KEY}/home/testLocale/pagecontent`,
        name: "test",
        primaryNodeType: "javascriptExample:testLocale",
      });
    });
  });

  beforeEach('Login', () => { cy.login(); });
  afterEach('Logout', () => { cy.logout(); });

  it("should display the locale", () => {
    cy.visit(`/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/testLocale.html`);
    cy.get('div[test-shouldbeEn="true"]').each(($el) => {
      cy.wrap($el).should("exist").contains("en");
    });
  });
});
