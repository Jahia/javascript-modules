import { addNode } from "@jahia/cypress";
import { addSimplePage } from "../../utils/helpers";
import { GENERIC_SITE_KEY } from '../../support/constants';

describe("Render should be editable", () => {
  before("Create test contents", () => {
    addSimplePage(
      `/sites/${GENERIC_SITE_KEY}/home`,
      "testRenderEditable",
      "Test render editable",
      "en",
      "simple",
      [
        {
          name: "pagecontent",
          primaryNodeType: "jnt:contentList",
        },
        {
          name: "header",
          primaryNodeType: "jnt:contentList",
        },
      ],
    ).then(() => {
      addNode({
        parentPathOrId: `/sites/${GENERIC_SITE_KEY}/home/testRenderEditable/pagecontent`,
        name: "test",
        primaryNodeType: "javascriptExample:testRenderEditable",
      });
      addNode({
        parentPathOrId: `/sites/${GENERIC_SITE_KEY}/home/testRenderEditable/pagecontent/test`,
        name: "text",
        primaryNodeType: "javascriptExample:simpleText",
        properties: [{ name: "text", value: "Testing editable", language: "en" }],
      });
    });
  });

  beforeEach("Login and visit test page", () => {
    cy.login();
    cy.visit(`/jahia/jcontent/${GENERIC_SITE_KEY}/en/pages/home/testRenderEditable`);
  });

  afterEach("Logout", () => cy.logout());

  it("Without parameter, text should be editable", () => {
    cy.iframe("#page-builder-frame-1").within(() => {
      cy.get('div[data-testid="react-render-editable-default"]')
        .find('div[class="childs"]>div[jahiatype="module"]')
        .should("exist");
    });
  });

  it("With parameter set to false, text should not be editable", () => {
    cy.iframe("#page-builder-frame-1").within(() => {
      cy.get('div[data-testid="react-render-not-editable"]')
        .find('div[class="childs"]>div[jahiatype="module"]')
        .should("not.exist");
    });
  });

  it("With parameter set to true, text should be editable", () => {
    cy.iframe("#page-builder-frame-1").within(() => {
      cy.get('div[data-testid="react-render-editable"]')
        .find('div[class="childs"]>div[jahiatype="module"]')
        .should("exist");
    });
  });
});
