import { addNode } from "@jahia/cypress";
import { addSimplePage } from "../../utils/helpers";
import { GENERIC_SITE_KEY } from '../../support/constants';

describe("Test GQL", () => {
  before("Create test page and contents", () => {
    addSimplePage(`/sites/${GENERIC_SITE_KEY}/home`, "testJGQL", "testJGQL", "en", "simple", [
      {
        name: "pagecontent",
        primaryNodeType: "jnt:contentList",
      },
    ]).then(() => {
      addNode({
        parentPathOrId: `/sites/${GENERIC_SITE_KEY}/home/testJGQL/pagecontent`,
        name: "test",
        primaryNodeType: "javascriptExample:testGQL",
        properties: [
          { name: "jcr:title", value: "test component" },
          { name: "prop1", value: "prop1 value" },
          { name: "prop2", value: "prop2 value" },
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

  it("Check GQL execution in current view", function () {
    cy.visit(`/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/testJGQL.html`);
    cy.get('li[data-testid="j:nodename"]').should("contain", "test");
    cy.get('li[data-testid="jcr:title"]').should("contain", "test component");
    cy.get('li[data-testid="prop1"]').should("contain", "prop1 value");
    cy.get('li[data-testid="prop2"]').should("contain", "prop2 value");
    cy.get('li[data-testid="propRichText"]').should("contain", "Hello this is a sample rich text");
  });
});
