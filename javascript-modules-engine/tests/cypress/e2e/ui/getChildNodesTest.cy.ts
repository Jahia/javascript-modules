import { addNode } from "@jahia/cypress";
import { addSimplePage } from "../../utils/helpers";
import { GENERIC_SITE_KEY } from '../../support/constants';

describe("getChildNodes function test", () => {
  before("Create test page and contents", () => {
    addSimplePage(
      `/sites/${GENERIC_SITE_KEY}/home`,
      "testGetChildNodes",
      "Test getChildNodes",
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
        parentPathOrId: `/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes/pagecontent`,
        name: "getChildNodesTest",
        primaryNodeType: "javascriptExample:testGetChildNodes",
        children: [
          {
            name: "child1",
            primaryNodeType: "javascriptExample:testGetChildNodes",
          },
          {
            name: "child2",
            primaryNodeType: "javascriptExample:testGetChildNodes",
          },
          {
            name: "filtered",
            primaryNodeType: "javascriptExample:testGetChildNodes",
          },
          {
            name: "filtered2",
            primaryNodeType: "javascriptExample:testGetChildNodes",
          },
          {
            name: "filtered3",
            primaryNodeType: "javascriptExample:testGetChildNodes",
          },
        ],
      });
    });
  });

  beforeEach('Login', () => { cy.login(); });
  afterEach('Logout', () => { cy.logout(); });

  it("Verify all children returned", function () {
    cy.visit(
      `/jahia/page-composer/default/en/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes.html`,
    );
    cy.visit(`/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes.html`);

    cy.get('div[data-testid="getChildNodes_all_1"]').contains(
      `/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes/pagecontent/getChildNodesTest/child1`,
    );
    cy.get('div[data-testid="getChildNodes_all_2"]').contains(
      `/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes/pagecontent/getChildNodesTest/child2`,
    );
    cy.get('div[data-testid="getChildNodes_all_3"]').contains(
      `/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes/pagecontent/getChildNodesTest/filtered`,
    );
    cy.get('div[data-testid="getChildNodes_all_4"]').contains(
      `/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes/pagecontent/getChildNodesTest/filtered2`,
    );
    cy.get('div[data-testid="getChildNodes_all_5"]').contains(
      `/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes/pagecontent/getChildNodesTest/filtered3`,
    );
  });

  it("Verify filtered children returned", function () {
    cy.visit(
      `/jahia/page-composer/default/en/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes.html`,
    );
    cy.visit(`/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes.html`);

    cy.get('div[data-testid="getChildNodes_filtered_1"]').contains(
      `/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes/pagecontent/getChildNodesTest/filtered`,
    );
    cy.get('div[data-testid="getChildNodes_filtered_2"]').contains(
      `/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes/pagecontent/getChildNodesTest/filtered2`,
    );
    cy.get('div[data-testid="getChildNodes_filtered_3"]').contains(
      `/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes/pagecontent/getChildNodesTest/filtered3`,
    );
    cy.get('div[data-testid="getChildNodes_filtered_4"]').should("not.exist");
    cy.get('div[data-testid="getChildNodes_filtered_5"]').should("not.exist");
  });

  it("Verify filtered + offset children returned", function () {
    cy.visit(
      `/jahia/page-composer/default/en/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes.html`,
    );
    cy.visit(`/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes.html`);

    cy.get('div[data-testid="getChildNodes_filteredOffset_1"]').contains(
      `/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes/pagecontent/getChildNodesTest/filtered2`,
    );
    cy.get('div[data-testid="getChildNodes_filteredOffset_2"]').contains(
      `/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes/pagecontent/getChildNodesTest/filtered3`,
    );
    cy.get('div[data-testid="getChildNodes_filteredOffset_3"]').should("not.exist");
    cy.get('div[data-testid="getChildNodes_filteredOffset_4"]').should("not.exist");
    cy.get('div[data-testid="getChildNodes_filteredOffset_5"]').should("not.exist");
  });

  it("Verify filtered + limit children returned", function () {
    cy.login();
    cy.visit(
      `/jahia/page-composer/default/en/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes.html`,
    );
    cy.visit(`/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes.html`);

    cy.get('div[data-testid="getChildNodes_filteredLimit_1"]').contains(
      `/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes/pagecontent/getChildNodesTest/filtered`,
    );
    cy.get('div[data-testid="getChildNodes_filteredLimit_2"]').should("not.exist");
    cy.get('div[data-testid="getChildNodes_filteredLimit_3"]').should("not.exist");
    cy.get('div[data-testid="getChildNodes_filteredLimit_4"]').should("not.exist");
    cy.get('div[data-testid="getChildNodes_filteredLimit_5"]').should("not.exist");
  });

  it("Verify filtered + limit + offset children returned", function () {
    cy.visit(
      `/jahia/page-composer/default/en/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes.html`,
    );
    cy.visit(`/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes.html`);

    cy.get('div[data-testid="getChildNodes_filteredLimitOffset_1"]').contains(
      `/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes/pagecontent/getChildNodesTest/filtered2`,
    );
    cy.get('div[data-testid="getChildNodes_filteredLimitOffset_2"]').should("not.exist");
    cy.get('div[data-testid="getChildNodes_filteredLimitOffset_3"]').should("not.exist");
    cy.get('div[data-testid="getChildNodes_filteredLimitOffset_4"]').should("not.exist");
    cy.get('div[data-testid="getChildNodes_filteredLimitOffset_5"]').should("not.exist");
  });

  it("Verify limited children returned", function () {
    cy.visit(
      `/jahia/page-composer/default/en/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes.html`,
    );
    cy.visit(`/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes.html`);

    cy.get('div[data-testid="getChildNodes_limit_1"]').contains(
      `/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes/pagecontent/getChildNodesTest/child1`,
    );
    cy.get('div[data-testid="getChildNodes_limit_2"]').contains(
      `/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes/pagecontent/getChildNodesTest/child2`,
    );
    cy.get('div[data-testid="getChildNodes_limit_3"]').should("not.exist");
    cy.get('div[data-testid="getChildNodes_limit_4"]').should("not.exist");
    cy.get('div[data-testid="getChildNodes_limit_5"]').should("not.exist");
  });

  it("Verify limited + offset children returned", function () {
    cy.visit(
      `/jahia/page-composer/default/en/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes.html`,
    );
    cy.visit(`/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes.html`);

    cy.get('div[data-testid="getChildNodes_limitOffset_1"]').contains(
      `/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes/pagecontent/getChildNodesTest/filtered`,
    );
    cy.get('div[data-testid="getChildNodes_limitOffset_2"]').contains(
      `/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes/pagecontent/getChildNodesTest/filtered2`,
    );
    cy.get('div[data-testid="getChildNodes_limitOffset_3"]').should("not.exist");
    cy.get('div[data-testid="getChildNodes_limitOffset_4"]').should("not.exist");
    cy.get('div[data-testid="getChildNodes_limitOffset_5"]').should("not.exist");
  });

  it("Verify limit is mandatory", function () {
    cy.visit(
      `/jahia/page-composer/default/en/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes.html`,
    );
    cy.visit(`/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes.html`);

    cy.get('div[data-testid="getChildNodes_limitMandatory_1"]').should("not.exist");
    cy.get('div[data-testid="getChildNodes_limitMandatory_2"]').should("not.exist");
    cy.get('div[data-testid="getChildNodes_limitMandatory_3"]').should("not.exist");
    cy.get('div[data-testid="getChildNodes_limitMandatory_4"]').should("not.exist");
    cy.get('div[data-testid="getChildNodes_limitMandatory_5"]').should("not.exist");
  });

  it("Verify offset", function () {
    cy.visit(
      `/jahia/page-composer/default/en/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes.html`,
    );
    cy.visit(`/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes.html`);

    cy.get('div[data-testid="getChildNodes_offset_1"]').contains(
      `/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes/pagecontent/getChildNodesTest/filtered`,
    );
    cy.get('div[data-testid="getChildNodes_offset_2"]').contains(
      `/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes/pagecontent/getChildNodesTest/filtered2`,
    );
    cy.get('div[data-testid="getChildNodes_offset_3"]').contains(
      `/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes/pagecontent/getChildNodesTest/filtered3`,
    );
    cy.get('div[data-testid="getChildNodes_offset_4"]').should("not.exist");
    cy.get('div[data-testid="getChildNodes_offset_5"]').should("not.exist");
  });

  it("Verify RenderChildren", function () {
    cy.visit(`/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes.html`);

    for (const child of ["child1", "child2", "filtered", "filtered2", "filtered3"]) {
      cy.get('div[data-testid="renderAllChildren"]').contains(
        `/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes/pagecontent/getChildNodesTest/${child}`,
      );
    }

    for (const child of ["filtered", "filtered2", "filtered3"]) {
      cy.get('div[data-testid="renderFilteredChildren"]').contains(
        `/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes/pagecontent/getChildNodesTest/${child}`,
      );
    }

    for (const child of ["child2", "filtered"]) {
      cy.get('div[data-testid="renderPaginatedChildren"]').contains(
        `/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes/pagecontent/getChildNodesTest/${child}`,
      );
    }
  });

  it("Verify RenderChild", function () {
    cy.visit(`/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes.html`);

    cy.get('div[data-testid="renderChild"]').contains(
      `/sites/${GENERIC_SITE_KEY}/home/testGetChildNodes/pagecontent/getChildNodesTest/child1`,
    );
  });
});
