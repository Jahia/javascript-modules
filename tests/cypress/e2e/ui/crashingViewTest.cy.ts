import {addNode} from '@jahia/cypress';
import {addSimplePage} from '../../utils/Utils';

describe('Error handling test during JS view execution', () => {
    before('Create test contents', () => {
        addSimplePage('/sites/npmTestSite/home', 'testCrashingView', 'testCrashingView', 'en', 'simple', [
            {
                name: 'pagecontent',
                primaryNodeType: 'jnt:contentList'
            }
        ]).then(() => {
            addNode({
                parentPathOrId: '/sites/npmTestSite/home/testCrashingView/pagecontent',
                name: 'test',
                primaryNodeType: 'npmExample:testCrashingView'
            });
        });
    });

    it('Check error handling when rendering a crashing JS view', () => {
        cy.login();
        cy.visit('/jahia/jcontent/npmTestSite/en/pages/home/testCrashingView');
        cy.iframe('[data-sel-role="page-builder-frame-active"]', {timeout: 90000, log: true}).within(() => {
            // Check that the error information is correctly displayed
            cy.get('[data-sel-role="renderingFailureViewKey"]').should('contain', 'default');
            cy.get('[data-sel-role="renderingFailureViewPath"]').should('contain', '/jahia-npm-module-example_view_npmExample:testCrashingView_default');
            cy.get('[data-sel-role="renderingFailureErrorMessage"]').should('contain', 'Property not_existing_property not found on node: /sites/npmTestSite/home/testCrashingView/pagecontent/test');
            // Check that by default the full error is not displayed
            cy.get('[data-sel-role="renderingFailureFullError"]').should('not.be.visible');
            // Check that clicking on the button displays the full error
            cy.get('button[data-sel-role="renderingFailureToggleFullError"]').click();
            cy.get('[data-sel-role="renderingFailureFullError"]').should('be.visible');
            // Check that clicking again on the button hides the full error
            cy.get('button[data-sel-role="renderingFailureToggleFullError"]').click();
            cy.get('[data-sel-role="renderingFailureFullError"]').should('not.be.visible');
        });
        cy.logout();
    });

    afterEach('Logout', () => cy.logout());
});
