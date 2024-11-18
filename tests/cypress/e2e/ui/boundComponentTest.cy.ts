import {enableModule, publishAndWaitJobEnding} from '@jahia/cypress';
import {addEvent, addEventPageAndEvents, addSimplePage} from '../../utils/Utils';

describe('Check on bound components', () => {
    const siteKey = 'npmTestSite';

    before(() => {
        enableModule('calendar', siteKey);
        enableModule('event', siteKey);

        addSimplePage('/sites/npmTestSite/home', 'testBoundComponent', 'testBoundComponent', 'en', 'boundComponent').then(() => {
            publishAndWaitJobEnding(`/sites/${siteKey}/home/testBoundComponent`);
        });
    });

    const validateNumberOfEventInCalendar = (expectedNumber: number) => {
        cy.get(`span[class*="fc-event-title"]:contains("${expectedNumber}")`).should('exist');
    };

    it('Verify calendar (.jsp content in the template) is correctly bound to the events list', function () {
        cy.login();
        const pageName = 'test1';
        const pageTemplate = 'events';
        addEventPageAndEvents(siteKey, pageTemplate, pageName, () => {
            cy.visit(`/jahia/page-composer/default/en/sites/${siteKey}/home/${pageName}.html`);
            cy.visit(`/cms/render/default/en/sites/${siteKey}/home/${pageName}.html`);
            validateNumberOfEventInCalendar(2);
        });
        cy.logout();
    });

    it('Verify that the calendar is correctly refreshed once a new event is added', function () {
        cy.login();
        const pageName = 'test2';
        const pageTemplate = 'events';
        addEventPageAndEvents(siteKey, pageTemplate, pageName, () => {
            publishAndWaitJobEnding(`/sites/${siteKey}/home/${pageName}`);
            cy.visit(`/sites/${siteKey}/home/${pageName}.html`, {failOnStatusCode: false});

            const inTwoDays = new Date();
            inTwoDays.setDate(inTwoDays.getDate() + 2);
            addEvent(siteKey, {
                pageName,
                name: 'event-c',
                title: 'The third event',
                startDate: inTwoDays
            });

            publishAndWaitJobEnding(`/sites/${siteKey}/home/${pageName}`);

            cy.visit(`/jahia/page-composer/default/en/sites/${siteKey}/home/${pageName}.html`);
            cy.visit(`/sites/${siteKey}/home/${pageName}.html`, {failOnStatusCode: false});

            validateNumberOfEventInCalendar(2);
            validateNumberOfEventInCalendar(1);
        });
        cy.logout();
    });

    it('Verify that the facets is working correctly', function () {
        cy.login();
        const pageName = 'test3';
        const pageTemplate = 'events';
        addEventPageAndEvents(siteKey, pageTemplate, pageName, () => {
            // Create events with event type for facets
            const today = new Date();
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            addEvent(siteKey, {
                pageName,
                name: 'event-meeting',
                title: 'The meeting event',
                startDate: today,
                endDate: tomorrow,
                eventsType: 'meeting'
            });
            addEvent(siteKey, {
                pageName,
                name: 'event-consumerShow',
                title: 'The consumerShow event',
                startDate: today,
                endDate: tomorrow,
                eventsType: 'consumerShow'
            });
            publishAndWaitJobEnding(`/sites/${siteKey}/home/${pageName}`);

            // Check facets display
            cy.visit(`/sites/${siteKey}/home/${pageName}.html`, {failOnStatusCode: false});
            cy.get('.eventsListItem').should('have.length', 4);
            cy.get('div[class*="facetsList"] a:contains("consumerShow")').should('exist');
            cy.get('div[class*="facetsList"] a:contains("meeting")').should('exist');

            // Activate consumerShow facet
            cy.get('div[class*="facetsList"] a:contains("consumerShow")').click();
            cy.get('.eventsListItem').should('have.length', 1);

            // Deactivate consumerShow facet
            cy.get('a:contains("remove")').click();
            cy.get('.eventsListItem').should('have.length', 4);

            // Activate meeting facet
            cy.get('div[class*="facetsList"] a:contains("meeting")').click();
            cy.get('.eventsListItem').should('have.length', 3);

            // Deactivate consumerShow facet
            cy.get('a:contains("remove")').click();
            cy.get('.eventsListItem').should('have.length', 4);
        });
        cy.logout();
    });

    it('Test boundComponent behavior with area/list creation by edit mode', function () {
        cy.login();
        // The page have been published without rendering in edit mode, list for area won't be created yet, check live:
        cy.visit('/sites/npmTestSite/home/testBoundComponent.html', {failOnStatusCode: false});
        cy.get('[data-testid="boundComponent_path"]').should('contain', 'null');
        // Check preview:
        cy.visit('/cms/render/default/en/sites/npmTestSite/home/testBoundComponent.html');
        cy.get('[data-testid="boundComponent_path"]').should('contain', 'null');

        // Go to edit mode to trigger the area/list creation
        cy.visit('/jahia/jcontent/npmTestSite/en/pages/home/testBoundComponent');
        cy.iframe('[data-sel-role="page-builder-frame-active"]', {timeout: 90000, log: true}).within(() => {
            // The list should have been created
            cy.get('[data-testid="boundComponent_path"]').should('contain', '/npmTestSite/home/testBoundComponent/events');
        });
        // Retest preview that should now be correct
        cy.visit('/cms/render/default/en/sites/npmTestSite/home/testBoundComponent.html');
        cy.get('[data-testid="boundComponent_path"]').should('contain', '/npmTestSite/home/testBoundComponent/events');
        // Retest live that should still not be correct, since we didn't publish the changes
        cy.visit('/sites/npmTestSite/home/testBoundComponent.html', {failOnStatusCode: false});
        cy.get('[data-testid="boundComponent_path"]').should('contain', 'null');

        // Publish the changes, and retest live that should be correct
        publishAndWaitJobEnding('/sites/npmTestSite/home/testBoundComponent');
        cy.visit('/sites/npmTestSite/home/testBoundComponent.html', {failOnStatusCode: false});
        cy.get('[data-testid="boundComponent_path"]').should('contain', '/npmTestSite/home/testBoundComponent/events');
        cy.logout();
    });
});
