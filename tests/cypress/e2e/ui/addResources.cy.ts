import { addNode } from "@jahia/cypress";
import { addSimplePage } from "../../utils/helpers";
import { GENERIC_SITE_KEY } from '../../support/constants';

describe("Test on add resources component/helper", () => {
  const pageName = "testAddResources";

  before("Create test page and contents", () => {
    addSimplePage(`/sites/${GENERIC_SITE_KEY}/home`, pageName, pageName, "en", "simple", [
      {
        name: "pagecontent",
        primaryNodeType: "jnt:contentList",
      },
    ]).then(() => {
      addNode({
        parentPathOrId: `/sites/${GENERIC_SITE_KEY}/home/${pageName}/pagecontent`,
        name: "test",
        primaryNodeType: "javascriptExample:testCurrentContent",
        properties: [
          { name: "jcr:title", value: "test component" },
          { name: "prop1", value: "prop1 value" },
          { name: "propMultiple", values: ["value 1", "value 2", "value 3"] },
          {
            name: "propRichText",
            value: '<p data-testid="propRichTextValue">Hello this is a sample rich text</p>',
          },
        ],
      });
    });
  });

  beforeEach("Login", () => { cy.login(); });
  afterEach('Logout', () => { cy.logout(); });

  it(`${pageName}: should not contain a div in the head tag in the page source code`, () => {
    cy.request(`/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/${pageName}.html`)
      .then((response) => {
        const regex = /<head>[\s\S]*?<div>[\s\S]*?<\/head>/;
        expect(regex.test(response.body)).to.be.false;
      });
  });

  it(`${pageName} : should contain a link tag in the head tag to load the CSS styles`, () => {
    cy.visit(`/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/${pageName}.html`);
    cy.get('head link[href="/modules/javascript-modules-engine-test-module/css/styles.css"]').then(
      ($link: JQuery<HTMLLinkElement>) => {
        expect($link.attr("id")).to.match(/^staticAssetCSS/);
      },
    );
  });

  it(`${pageName} : should contain a script tag under the body tag`, () => {
    cy.visit(`/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/${pageName}.html`);
    cy.get(
      'body script[src="/modules/javascript-modules-engine-test-module/javascript/body-script.js"]',
    )
      .should("exist")
      .then(($script: JQuery<HTMLScriptElement>) => {
        expect($script.attr("id")).to.match(/^staticAssetJavascriptBODY/); // Replace with your specific string
      });
  });

  it(`${pageName} : should contain the test body element created by the body script`, () => {
    cy.visit(`/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/${pageName}.html`);
    cy.get("#testBodyElement").should("exist");
  });

  it(`${pageName} : should contain a script tag under the head tag`, () => {
    cy.visit(`/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/${pageName}.html`);
    cy.get(
      `head script[src="${"/modules/javascript-modules-engine-test-module/javascript/head-script.js"}"]`,
    )
      .should("exist")
      .then(($script: JQuery<HTMLScriptElement>) => {
        expect($script.attr("id")).to.match(/^staticAssetJavascript/); // Replace with your specific string
      });
  });

  it(`${pageName} : should contain the test head element created by the head script`, () => {
    cy.visit(`/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/${pageName}.html`);
    cy.get("#testHeadElement").should("exist");
  });

  it(`${pageName} : should contain the test inline script element created by the inline script`, () => {
    cy.visit(`/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/${pageName}.html`);
    cy.get("#testInlineScript").should("exist");
  });
});
