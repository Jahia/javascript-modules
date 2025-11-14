import { addNode, enableModule } from "@jahia/cypress";
import { addSimplePage } from "../../utils/helpers";
import { GENERIC_SITE_KEY } from '../../support/constants';
import "cypress-wait-until";

describe("Absolute Area test", () => {
  const pageName = "testAbsoluteArea";

  before("Create test page and contents", () => {
    enableModule("event", GENERIC_SITE_KEY);

    // First let's create the content on the home page that will be referenced by areas in the test pages.
    addNode({
      parentPathOrId: `/sites/${GENERIC_SITE_KEY}/home`,
      name: "pagecontent",
      primaryNodeType: "jnt:contentList",
    });

    addNode({
      parentPathOrId: `/sites/${GENERIC_SITE_KEY}/home/pagecontent`,
      name: "twoColumns",
      primaryNodeType: "javascriptExample:testAreaColumns",
    });

    addNode({
      parentPathOrId: `/sites/${GENERIC_SITE_KEY}/home/pagecontent/twoColumns`,
      name: "twoColumns-col-1",
      primaryNodeType: "jnt:contentList",
    });

    addNode({
      parentPathOrId: `/sites/${GENERIC_SITE_KEY}/home/pagecontent/twoColumns/twoColumns-col-1`,
      name: "bigText",
      primaryNodeType: "jnt:bigText",
      properties: [{ name: "text", value: "Column 1", language: "en" }],
    });

    addNode({
      parentPathOrId: `/sites/${GENERIC_SITE_KEY}/home/pagecontent/twoColumns`,
      name: "twoColumns-col-2",
      primaryNodeType: "jnt:contentList",
    });

    addNode({
      parentPathOrId: `/sites/${GENERIC_SITE_KEY}/home/pagecontent/twoColumns/twoColumns-col-2`,
      name: "bigText",
      primaryNodeType: "jnt:bigText",
      properties: [{ name: "text", value: "Column 2", language: "en" }],
    });

    addSimplePage(`/sites/${GENERIC_SITE_KEY}/home`, pageName, pageName, "en", "simple", [
      {
        name: "pagecontent",
        primaryNodeType: "jnt:contentList",
      },
    ]);
    addNode({
      parentPathOrId: `/sites/${GENERIC_SITE_KEY}/home/${pageName}/pagecontent`,
      name: "test",
      primaryNodeType: "javascriptExample:testAbsoluteAreas",
    });
    addNode({
      parentPathOrId: `/sites/${GENERIC_SITE_KEY}/home/${pageName}/pagecontent/test`,
      // the content node is expected to exist in TestAbsolutArea
      name: "basicArea",
      primaryNodeType: "jnt:contentList",
    });
    addSimplePage(`/sites/${GENERIC_SITE_KEY}`, "custom", "Custom", "en", "simple").then(() =>
      addSimplePage(`/sites/${GENERIC_SITE_KEY}/custom`, "sub-level", "Sub level", "en", "simple"),
    );
  });

  beforeEach("Login and visit test page", () => {
    cy.login();
    cy.visit(`/jahia/jcontent/${GENERIC_SITE_KEY}/en/pages/home/${pageName}`);
  });

  afterEach("Logout", () => cy.logout());

  it(`${pageName}: Basic Area test`, () => {
    cy.iframe("#page-builder-frame-1").within(() => {
      cy.get('div[data-testid="basicArea"]').find('div[type="absoluteArea"]').should("be.visible");
    });
  });

  it(`${pageName}: Allowed types area`, () => {
    cy.iframe("#page-builder-frame-1").within(() => {
      cy.get('div[data-testid="allowedTypesArea"]')
        .find('div[type="placeholder"]')
        .then((buttons) => {
          const selector = `div[data-jahia-id="${buttons.attr("id")}"]`;
          cy.get(selector).find('button[data-sel-role="jnt:bigText"]').should("be.visible");
          cy.get(selector).find('button[data-sel-role="jnt:event"]').should("be.visible");
          cy.get(selector)
            .find('button[data-sel-role!="jnt:event"][data-sel-role!="jnt:bigText"]')
            .should("not.exist");
        });
    });
  });

  it(`${pageName}: Number of items area`, () => {
    addNode({
      parentPathOrId: `/sites/${GENERIC_SITE_KEY}/home/${pageName}/numberOfItemsArea`,
      name: "item1",
      primaryNodeType: "jnt:bigText",
    });
    addNode({
      parentPathOrId: `/sites/${GENERIC_SITE_KEY}/home/${pageName}/numberOfItemsArea`,
      name: "item2",
      primaryNodeType: "jnt:bigText",
    });
    cy.reload();
    cy.iframe("#page-builder-frame-1").within(() => {
      cy.get('div[data-testid="numberOfItemsArea"]')
        .find('div[type="placeholder"]')
        .should("not.be.visible");
    });
  });

  it(`${pageName}: areaView Area`, () => {
    cy.iframe("#page-builder-frame-1").within(() => {
      cy.get('div[data-testid="areaViewArea"]').find('ul[class*="dropdown"]').should("be.visible");
    });
  });

  it(`${pageName}: absolute Area home page`, () => {
    cy.iframe("#page-builder-frame-1").within(() => {
      cy.get('div[data-testid="absoluteAreaHomePage"] div[data-testid="row-twoColumns"]').should(
        "exist",
      );
    });
  });

  it(`${pageName}: absolute Area site root`, () => {
    cy.iframe("#page-builder-frame-1").within(() => {
      cy.get('div[data-testid="absoluteAreaCustomPage"]')
        .find('div[type="absoluteArea"]')
        .should("be.visible");
    });
  });

  it(`${pageName}: absolute Area custom page (sub-level)`, () => {
    cy.iframe("#page-builder-frame-1").within(() => {
      cy.get('div[data-testid="absoluteAreaCustomPage"]')
        .find('div[type="absoluteArea"]')
        .should("be.visible");
    });
  });

  it(`${pageName}: non editable Area`, () => {
    cy.iframe("#page-builder-frame-1").within(() => {
      cy.get('div[data-testid="nonEditableArea"]').should("be.empty");
    });
  });

  it(`${pageName}: Area type`, () => {
    cy.iframe("#page-builder-frame-1").within(() => {
      cy.get('div[data-testid="areaType"]').find('div[data-testid="row-areaType"]').should("exist");
    });
  });

  it(`${pageName}: Limited absolute area editing`, () => {
    cy.iframe("#page-builder-frame-1").within(() => {
      cy.get('div[data-testid="limitedAbsoluteAreaEdit"]')
        .find('div[type="existingNode"]')
        .should("not.exist");
    });
  });

  it(`${pageName}: should render absolute area with parameters`, function () {
    cy.iframe("#page-builder-frame-1").within(() => {
      cy.get('div[data-testid="areaParam-string1"]').should("contain", "stringParam1=stringValue1");
      cy.get('div[data-testid="areaParam-string2"]').should("contain", "stringParam2=stringValue2");
    });
  });
});
