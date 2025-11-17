import { enableModule, publishAndWaitJobEnding } from "@jahia/cypress";
import { addEvent, addEventPageAndEvents, addSimplePage } from "../../utils/helpers";
import { GENERIC_SITE_KEY } from '../../support/constants';

describe("Check on bound components", () => {
  before(() => {
    enableModule("calendar", GENERIC_SITE_KEY);
    enableModule("event", GENERIC_SITE_KEY);

    addSimplePage(
      `/sites/${GENERIC_SITE_KEY}/home`,
      "testBoundComponent",
      "testBoundComponent",
      "en",
      "boundComponent",
    ).then(() => {
      publishAndWaitJobEnding(`/sites/${GENERIC_SITE_KEY}/home/testBoundComponent`);
    });
  });

  beforeEach('Login', () => {  cy.login(); });
  afterEach('Logout', () => { cy.logout(); });

  const validateNumberOfEventInCalendar = (expectedNumber: number) => {
    cy.get(`span[class*="fc-event-title"]:contains("${expectedNumber}")`).should("exist");
  };

  it("Verify calendar (.jsp content in the template) is correctly bound to the events list", function () {
    const pageName = "test1";
    const pageTemplate = "events";
    addEventPageAndEvents(GENERIC_SITE_KEY, pageTemplate, pageName, () => {
      cy.visit(`/jahia/page-composer/default/en/sites/${GENERIC_SITE_KEY}/home/${pageName}.html`);
      cy.visit(`/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/${pageName}.html`);
      validateNumberOfEventInCalendar(2);
    });
  });

  it("Verify that the calendar is correctly refreshed once a new event is added", function () {
    const pageName = "test2";
    const pageTemplate = "events";
    addEventPageAndEvents(GENERIC_SITE_KEY, pageTemplate, pageName, () => {
      publishAndWaitJobEnding(`/sites/${GENERIC_SITE_KEY}/home/${pageName}`);
      cy.visit(`/sites/${GENERIC_SITE_KEY}/home/${pageName}.html`, { failOnStatusCode: false });

      const inTwoDays = new Date();
      inTwoDays.setDate(inTwoDays.getDate() + 2);
      addEvent(GENERIC_SITE_KEY, {
        pageName,
        name: "event-c",
        title: "The third event",
        startDate: inTwoDays,
      });

      publishAndWaitJobEnding(`/sites/${GENERIC_SITE_KEY}/home/${pageName}`);

      cy.visit(`/jahia/page-composer/default/en/sites/${GENERIC_SITE_KEY}/home/${pageName}.html`);
      cy.visit(`/sites/${GENERIC_SITE_KEY}/home/${pageName}.html`, { failOnStatusCode: false });

      validateNumberOfEventInCalendar(2);
      validateNumberOfEventInCalendar(1);
    });
  });

  it("Verify that the facets is working correctly", function () {
    const pageName = "test3";
    const pageTemplate = "events";
    addEventPageAndEvents(GENERIC_SITE_KEY, pageTemplate, pageName, () => {
      // Create events with event type for facets
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      addEvent(GENERIC_SITE_KEY, {
        pageName,
        name: "event-meeting",
        title: "The meeting event",
        startDate: today,
        endDate: tomorrow,
        eventsType: "meeting",
      });
      addEvent(GENERIC_SITE_KEY, {
        pageName,
        name: "event-consumerShow",
        title: "The consumerShow event",
        startDate: today,
        endDate: tomorrow,
        eventsType: "consumerShow",
      });
      publishAndWaitJobEnding(`/sites/${GENERIC_SITE_KEY}/home/${pageName}`);

      // Check facets display
      cy.visit(`/sites/${GENERIC_SITE_KEY}/home/${pageName}.html`, { failOnStatusCode: false });
      cy.get(".eventsListItem").should("have.length", 4);
      cy.get('div[class*="facetsList"] a:contains("consumerShow")').should("exist");
      cy.get('div[class*="facetsList"] a:contains("meeting")').should("exist");

      // Activate consumerShow facet
      cy.get('div[class*="facetsList"] a:contains("consumerShow")').click();
      cy.get(".eventsListItem").should("have.length", 1);

      // Deactivate consumerShow facet
      cy.get('a:contains("remove")').click();
      cy.get(".eventsListItem").should("have.length", 4);

      // Activate meeting facet
      cy.get('div[class*="facetsList"] a:contains("meeting")').click();
      cy.get(".eventsListItem").should("have.length", 3);

      // Deactivate consumerShow facet
      cy.get('a:contains("remove")').click();
      cy.get(".eventsListItem").should("have.length", 4);
    });
  });

  it("Test boundComponent behavior with area/list creation by edit mode", function () {
    // The page have been published without rendering in edit mode, list for area won't be created yet, check live:
    cy.visit(`/sites/${GENERIC_SITE_KEY}/home/testBoundComponent.html`, { failOnStatusCode: false });
    cy.get('[data-testid="boundComponent_path"]').should("contain", "null");
    // Check preview:
    cy.visit(`/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/testBoundComponent.html`);
    cy.get('[data-testid="boundComponent_path"]').should("contain", "null");

    // Go to edit mode to trigger the area/list creation
    cy.visit(`/jahia/jcontent/${GENERIC_SITE_KEY}/en/pages/home/testBoundComponent`);
    cy.iframe('[data-sel-role="page-builder-frame-active"]', { timeout: 90000, log: true }).within(
      () => {
        // The list should have been created
        cy.get('[data-testid="boundComponent_path"]').should(
          "contain",
          `/${GENERIC_SITE_KEY}/home/testBoundComponent/events`,
        );
      },
    );
    // Retest preview that should now be correct
    cy.visit(`/cms/render/default/en/sites/${GENERIC_SITE_KEY}/home/testBoundComponent.html`);
    cy.get('[data-testid="boundComponent_path"]').should(
      "contain",
      `/${GENERIC_SITE_KEY}/home/testBoundComponent/events`,
    );
    // Retest live that should still not be correct, since we didn't publish the changes
    cy.visit(`/sites/${GENERIC_SITE_KEY}/home/testBoundComponent.html`, { failOnStatusCode: false });
    cy.get('[data-testid="boundComponent_path"]').should("contain", "null");

    // Publish the changes, and retest live that should be correct
    publishAndWaitJobEnding(`/sites/${GENERIC_SITE_KEY}/home/testBoundComponent`);
    cy.visit(`/sites/${GENERIC_SITE_KEY}/home/testBoundComponent.html`, { failOnStatusCode: false });
    cy.get('[data-testid="boundComponent_path"]').should(
      "contain",
      `/${GENERIC_SITE_KEY}/home/testBoundComponent/events`,
    );
  });
});
