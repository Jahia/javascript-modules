import { addNode, enableModule } from "@jahia/cypress";
import { addEventPageAndEvents, addSimplePage } from "../../utils/helpers";
import { GENERIC_SITE_KEY } from '../../support/constants';

describe("Content templates resolution testsuite", () => {
  before("Create test page and contents", () => {
    enableModule("calendar", GENERIC_SITE_KEY);
    enableModule("event", GENERIC_SITE_KEY);

    addEventPageAndEvents(GENERIC_SITE_KEY, "events", "testEvents", () => {
      addSimplePage(
        `/sites/${GENERIC_SITE_KEY}/home`,
        "testFindDisplayableNode",
        "Simple page",
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
          parentPathOrId: `/sites/${GENERIC_SITE_KEY}/home/testFindDisplayableNode/pagecontent`,
          name: "findDisplayableContent",
          primaryNodeType: "javascriptExample:testFindDisplayableContent",
          properties: [
            {
              name: "target",
              value: `/sites/${GENERIC_SITE_KEY}/home/testEvents/events/event-a`,
              type: "WEAKREFERENCE",
            },
          ],
        });
      });
    });

    addSimplePage(
      `/sites/${GENERIC_SITE_KEY}/home`,
      "testContentTemplate",
      "testContentTemplate",
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
        parentPathOrId: `/sites/${GENERIC_SITE_KEY}/home/testContentTemplate/pagecontent`,
        name: "content",
        primaryNodeType: "javascriptExample:testContentTemplate",
      });
    });

    addSimplePage(
      `/sites/${GENERIC_SITE_KEY}/home`,
      "testContentTemplateWithView",
      "testContentTemplateWithView",
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
        parentPathOrId: `/sites/${GENERIC_SITE_KEY}/home/testContentTemplateWithView/pagecontent`,
        name: "content",
        primaryNodeType: "javascriptExample:testContentTemplate",
        mixins: ["jmix:renderable"],
        properties: [{ name: "j:view", value: "other" }],
      });
    });
  });

  beforeEach('Login', () => { cy.login(); });
  afterEach('Logout', () => { cy.logout(); });

  it("Verify content template for jnt:event is correctly displayed", function () {
    cy.visit(
      `/jahia/page-composer/default/en/sites/${GENERIC_SITE_KEY}/home/testEvents/events/event-a.full.html`,
    );
    cy.visit(`/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/testEvents/events/event-a.full.html`);

    // Check template is good:
    cy.get('div[class="header"]').should("be.visible");
    cy.get('div[class="main"]').should("be.visible");
    cy.get('div[class="footer"]').should("be.visible");

    // Check main resource display is correct:
    cy.get('div[class="eventsBody"]').should("be.visible");
    cy.get('div[class="eventsBody"]').contains("The first event");
  });

  it("Verify findDisplayableNode is correctly resolving jnt:event that is using a JS content template", function () {
    cy.visit(`/jahia/page-composer/default/en/sites/${GENERIC_SITE_KEY}/home/testFindDisplayableNode.html`);
    cy.visit(`/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/testFindDisplayableNode.html`);

    cy.get('p[data-testid="displayableContent"]').contains(
      `Found displayable content: /sites/${GENERIC_SITE_KEY}/home/testEvents/events/event-a`,
    );
  });

  it("Test default content template is working properly when content doesn't have specific view", function () {
    cy.visit(
      `/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/testContentTemplate/pagecontent/content.html`,
    );
    // Check template is correctly resolved:
    cy.get(".header").should("exist");
    // Check content is correctly displayed:
    cy.contains("Just a normal view").should("be.visible");
  });

  it("Test default content template is working properly when content have specific view", function () {
    cy.visit(
      `/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/testContentTemplateWithView/pagecontent/content.html`,
    );
    // Check template is correctly resolved:
    cy.get(".header").should("exist");
    // Check content is correctly displayed:
    cy.contains("Just an other normal view").should("be.visible");
  });
});
