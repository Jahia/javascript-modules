import { addNode, publishAndWaitJobEnding } from "@jahia/cypress";
import { addSimplePage } from "../../utils/helpers";
import { GENERIC_SITE_KEY } from '../../support/constants';

describe("proxyProps function test", () => {
  before("Create test page and contents", () => {
    addSimplePage(
      `/sites/${GENERIC_SITE_KEY}/home`,
      "testProxyProps",
      "Test proxyProps",
      "en",
      "simple",
      [
        {
          name: "pagecontent",
          primaryNodeType: "jnt:contentList",
        },
      ],
    ).then(() => {
      addNode({
        parentPathOrId: `/sites/${GENERIC_SITE_KEY}/home/testProxyProps/pagecontent`,
        name: "testProxyPropsSample",
        primaryNodeType: "javascriptExample:testProxyProps",
        properties: [
          { name: "myFirstProp", value: "First prop value" },
          { name: "mySecondProp", value: "Second prop value" },
          { name: "myThirdProp", value: "Third prop value" },
          { name: "myFourthProp", value: "Fourth prop value" },
        ],
      }).then(() => {
        publishAndWaitJobEnding(`/sites/${GENERIC_SITE_KEY}/home`, ["en"]);
      });
    });
  });

  it("Verify property values from getNodeProps", function () {
    cy.visit(`/sites/${GENERIC_SITE_KEY}/home/testProxyProps.html`);

    cy.get('div[data-testid="proxyProps_myFirstProp"]').contains("First prop value");
    cy.get('div[data-testid="proxyProps_mySecondProp"]').contains("Second prop value");
    cy.get('div[data-testid="proxyProps_restOfProps_in"]').contains("true");
    cy.get('div[data-testid="proxyProps_restOfProps_items_myFirstProp"]').should("not.exist");
    cy.get('div[data-testid="proxyProps_restOfProps_items_mySecondProp"]').should("not.exist");
    cy.get('div[data-testid="proxyProps_restOfProps_items_myThirdProp"]').should("exist");
    cy.get('div[data-testid="proxyProps_restOfProps_items_myFourthProp"]').should("exist");
    cy.get('div[data-testid="proxyProps_restOfProps_items_jcr:uuid"]').should("exist");
  });
});
