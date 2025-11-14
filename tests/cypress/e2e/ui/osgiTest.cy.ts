import { addNode, publishAndWaitJobEnding } from "@jahia/cypress";
import { addSimplePage } from "../../utils/helpers";
import { GENERIC_SITE_KEY } from '../../support/constants';

describe("Test OSGi configuration in views", () => {
  const pageName = "testOSGi";

  before("Create test page", () => {
    addSimplePage(`/sites/${GENERIC_SITE_KEY}/home`, pageName, pageName, "en", "simple", [
      {
        name: "pagecontent",
        primaryNodeType: "jnt:contentList",
      },
    ]).then(() => {
      addNode({
        parentPathOrId: `/sites/${GENERIC_SITE_KEY}/home/${pageName}/pagecontent`,
        name: "test",
        primaryNodeType: "javascriptExample:testOSGi",
      });
    });
    publishAndWaitJobEnding(`/sites/${GENERIC_SITE_KEY}`);
  });

  beforeEach("Login", () => { cy.login(); });
  afterEach("Logout", () => { cy.logout(); });

  it(`is polite, says hello and sorts numbers`, function () {
    cy.visit(`/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/${pageName}.html`);
    cy.get('p[data-testid="hello"]').should("contain", "Good morning World!");
    cy.get('p[data-testid="numbers"]').should("contain", "1, 2, 3, 4");
  });
});
