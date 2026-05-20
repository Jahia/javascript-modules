import { addNode, getNodeByPath } from "@jahia/cypress";
import { addSimplePage } from "../../utils/helpers";
import { GENERIC_SITE_KEY } from '../../support/constants';

/**
 * This test verifies that the areaAsSubNode parameter works correctly,
 * ensuring that areas are stored as subnodes of the component rather than
 * at the page level
 */
describe("AreaAsSubNode test", () => {
  const pageName = "testAreaAsSubNode";
  const pagePath = `/sites/${GENERIC_SITE_KEY}/home/${pageName}`;
  const componentPath = `${pagePath}/pagecontent`;

  before("Create test page and multiple components", () => {
    addSimplePage(`/sites/${GENERIC_SITE_KEY}/home`, pageName, pageName, "en", "simple", [
      {
        name: "pagecontent",
        primaryNodeType: "jnt:contentList",
      },
    ]).then(() => {
      ['testArea', 'testArea2'].forEach((componentName) => {
        addNode({
          parentPathOrId: componentPath,
          name: componentName,
          primaryNodeType: "javascriptExample:testAreas"
        });
      })
    });
  });

  beforeEach('Login and visit test page', () => {
    cy.login();
    cy.visit(`/jahia/jcontent/${GENERIC_SITE_KEY}/en/pages/home/${pageName}`);
  });

  afterEach('Logout', () => cy.logout());

  it(`${pageName}: Area with areaAsSubNode=true should render`, () => {
    cy.iframe("#page-builder-frame-1").within(() => {
      cy.get('div[data-testid="areaAsSubNodeTrue"]')
        .find('div[type="area"]')
        .should("be.visible");
    });
  });

  it(`${pageName}: Area with areaAsSubNode=false should render`, () => {
    cy.iframe("#page-builder-frame-1").within(() => {
      cy.get('div[data-testid="areaAsSubNodeFalse"]')
        .find('div[type="area"]')
        .should("be.visible");
    });
  });

  it(`${pageName}: Area without areaAsSubNode param should create area as subnode of the page`, () => {
    const areaName = 'basicArea';
    getNodeByPath(`${pagePath}/${areaName}`).then((area) => {
      const msg = `${areaName} should be created as a subnode of the page`
      expect(area?.data?.jcr?.nodeByPath?.name, msg).to.equal(areaName);
    })
  });

  it(`${pageName}: areaAsSubNode=false should create area as subnode of the page`, () => {
    const areaName = 'noSubNodeArea';
    getNodeByPath(`${pagePath}/${areaName}`).then((area) => {
      const msg = `${areaName} should be created as a subnode of the page`
      expect(area?.data?.jcr?.nodeByPath?.name, msg).to.equal(areaName);
    })
  });

  it(`${pageName}: areaAsSubNode=true should create distinct areas as subnode of component`, () => {
    const areaName = 'subNodeArea';
    getNodeByPath(`${componentPath}/testArea/${areaName}`).then((area) => {
      const msg = `${areaName} should be created as a subnode of the test area component`
      expect(area?.data?.jcr?.nodeByPath?.name, msg).to.equal(areaName);
    })
    getNodeByPath(`${componentPath}/testArea2/${areaName}`).then((area) => {
      const msg = `${areaName} should be created as a subnode of the test area component`
      expect(area?.data?.jcr?.nodeByPath?.name, msg).to.equal(areaName);
    })
  });

});
