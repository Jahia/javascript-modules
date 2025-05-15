import { addNode, deleteNode, publishAndWaitJobEnding } from "@jahia/cypress";
import { addSimplePage } from "../../utils/Utils";

describe("Test React version", () => {
  before("Create test data", () => {
    addSimplePage(
      "/sites/javascriptTestSite/home",
      "testReactVersion",
      "testReactVersion",
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
        parentPathOrId: "/sites/javascriptTestSite/home/testReactVersion/pagecontent",
        name: "test",
        primaryNodeType: "javascriptExample:testReactVersion",
      });
    });

    publishAndWaitJobEnding("/sites/javascriptTestSite");
  });

  after("Cleanup test data", () => {
    deleteNode("/sites/javascriptTestSite/home/testReactVersion");
    publishAndWaitJobEnding("/sites/javascriptTestSite");
  });

  it("React version should be correct", function () {
    cy.login();
    cy.visit("/cms/render/default/en/sites/javascriptTestSite/home/testReactVersion.html");
    cy.get('span[data-testid="react-version"]').should("have.text", "19.1.0");
    cy.get('span[data-testid="node-env"]').should("have.text", "production");
    cy.logout();
  });
});
