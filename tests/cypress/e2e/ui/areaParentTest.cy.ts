import { addNode, getNodeByPath } from "@jahia/cypress";
import { addSimplePage } from "../../utils/helpers";
import { GENERIC_SITE_KEY } from '../../support/constants';

/**
 * This test verifies that the parent parameter on the Area component works correctly,
 * ensuring that areas are stored as subnodes of the specified parent node rather than
 * at the page level, and that two components with the same area name but different
 * parent nodes produce distinct area nodes.
 */
describe("Area with parent parameter test", () => {
  const pageName = "testAreaParent";
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
          primaryNodeType: "javascriptExample:testAreas",
        });
      });
    });
  });

  beforeEach('Login and visit test page', () => {
    cy.login();
    cy.visit(`/jahia/jcontent/${GENERIC_SITE_KEY}/en/pages/home/${pageName}`);
  });

  afterEach('Logout', () => cy.logout());

  it(`${pageName}: Area with parent (current node) should render`, () => {
    cy.iframe("#page-builder-frame-1").within(() => {
      cy.get('div[data-testid="areaWithParent"]')
        .find('div[type="area"]')
        .should("be.visible");
    });
  });

  it(`${pageName}: Area with home page as parent should render`, () => {
    cy.iframe("#page-builder-frame-1").within(() => {
      cy.get('div[data-testid="areaWithHomeParent"]')
        .find('div[type="area"]')
        .should("be.visible");
    });
  });

  it(`${pageName}: Area with site root as parent should render`, () => {
    cy.iframe("#page-builder-frame-1").within(() => {
      cy.get('div[data-testid="areaWithSiteParent"]')
        .find('div[type="area"]')
        .should("be.visible");
    });
  });

  it(`${pageName}: Area without parent should create area as subnode of the page`, () => {
    const areaName = 'basicArea';
    getNodeByPath(`${pagePath}/${areaName}`).then((area) => {
      const msg = `${areaName} should be created as a subnode of the page`;
      expect(area?.data?.jcr?.nodeByPath?.name, msg).to.equal(areaName);
    });
  });

  it(`${pageName}: Area with parent should create distinct areas as subnodes of each component`, () => {
    const areaName = 'parentArea';
    getNodeByPath(`${componentPath}/testArea/${areaName}`).then((area) => {
      const msg = `${areaName} should be created as a subnode of the first test area component`;
      expect(area?.data?.jcr?.nodeByPath?.name, msg).to.equal(areaName);
    });
    getNodeByPath(`${componentPath}/testArea2/${areaName}`).then((area) => {
      const msg = `${areaName} should be created as a subnode of the second test area component`;
      expect(area?.data?.jcr?.nodeByPath?.name, msg).to.equal(areaName);
    });
  });

  it(`${pageName}: Area with parent should NOT create area at the page level`, () => {
    const areaName = 'parentArea';
    getNodeByPath(`${pagePath}/${areaName}`).then((area) => {
      const msg = `${areaName} should NOT exist at the page level when parent is specified`;
      expect(area?.data?.jcr?.nodeByPath, msg).to.not.exist;
    });
  });

  it(`${pageName}: Area with home page as parent should store area under home`, () => {
    const areaName = 'areaAtHomePage';
    getNodeByPath(`/sites/${GENERIC_SITE_KEY}/home/${areaName}`).then((area) => {
      const msg = `${areaName} should be created as a subnode of the home page`;
      expect(area?.data?.jcr?.nodeByPath?.name, msg).to.equal(areaName);
    });
  });

  it(`${pageName}: Area with site root as parent should store area under site root`, () => {
    const areaName = 'areaAtSiteRoot';
    getNodeByPath(`/sites/${GENERIC_SITE_KEY}/${areaName}`).then((area) => {
      const msg = `${areaName} should be created as a subnode of the site root`;
      expect(area?.data?.jcr?.nodeByPath?.name, msg).to.equal(areaName);
    });
  });
});
