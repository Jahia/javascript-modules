import { publishAndWaitJobEnding } from "@jahia/cypress";
import { addSimplePage } from "../../utils/helpers";
import { GENERIC_SITE_KEY } from '../../support/constants';
import "cypress-iframe";

const checkSectionsPresence = () => {
  cy.get('div[class="header"]').should("be.visible");
  cy.get('div[class="main"]').should("be.visible");
  cy.get('div[class="footer"]').should("be.visible");
};

describe("Template testsuite", () => {
  const pageName = "testTemplate";

  before("Create test page and contents", () => {
    addSimplePage(`/sites/${GENERIC_SITE_KEY}/home`, pageName, pageName, "en", "simple", [
      {
        name: "pagecontent",
        primaryNodeType: "jnt:contentList",
      },
    ]);
  });

  beforeEach("Login and visit test page", () => {
    cy.login();
    cy.visit(`/jahia/jcontent/${GENERIC_SITE_KEY}/en/pages/home/${pageName}`);
  });

  afterEach("Logout", () => { cy.logout(); });

  it(`${pageName}: Verify 3 sections presence`, () => {
    cy.iframe("#page-builder-frame-1").within(() => {
      checkSectionsPresence();
    });
  });

  it(`${pageName}: Check grouping components`, () => {
    cy.iframe("#page-builder-frame-1").within(() => {
      cy.get('button[data-sel-role="createContent"]:first').click();
    });
    cy.get('li[role="treeitem"]:contains("javascriptExampleComponent")').click();
    cy.get('li[role="treeitem"]:contains("test")').should("be.visible");
  });

  it(`${pageName}: Check 3 sections presence in LIVE workspace`, () => {
    publishAndWaitJobEnding(`/sites/${GENERIC_SITE_KEY}`);
    cy.visit(`/sites/${GENERIC_SITE_KEY}/home/${pageName}.html`);
    checkSectionsPresence();
  });
});
