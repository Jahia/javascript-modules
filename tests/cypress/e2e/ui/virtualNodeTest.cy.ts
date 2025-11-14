import { addNode, createUser, deleteUser } from "@jahia/cypress";
import { addSimplePage } from "../../utils/helpers";
import { GENERIC_SITE_KEY } from '../../support/constants';

describe("Test virtual nodes", () => {
  const pageName = "testVirtualNode";

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
        primaryNodeType: "javascriptExample:testVirtualNode",
        properties: [{ name: "jcr:title", value: "Test Virtual Node" }],
      });
    });
  });

  beforeEach('Login', () => { cy.login(); });
  afterEach('Logout', () => { cy.logout(); });

  it(`${pageName}: Check virtual nodes are correctly rendered in preview mode`, function () {
    cy.visit(`/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/${pageName}.html`);
    cy.get('div[data-testid="testVirtualNodeSample_myProperty"]').contains(
      "this is a virtual node property",
    );
    cy.get('div[data-testid="virtualNode_aliasedUser"]').should("be.empty"); // logged as root, no alias
  });

  it(`${pageName}: Check virtual nodes are correctly rendered in customized preview mode`, function () {
    const users = ["fooUser", "barUser"];
    users.forEach((user) => {
      createUser(user, "testPassword");
      cy.visit(
        `/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/${pageName}.html?alias=${user}`,
      );
      cy.get('div[data-testid="testVirtualNodeSample_myProperty"]').should(
        "have.text",
        "this is a virtual node property",
      );
      cy.get('div[data-testid="virtualNode_aliasedUser"]').should("have.text", user);
      deleteUser("testUser");
    });
  });
});
