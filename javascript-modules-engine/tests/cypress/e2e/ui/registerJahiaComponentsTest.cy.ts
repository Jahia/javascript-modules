import {addNode} from '@jahia/cypress';
import {addSimplePage} from '../../utils/Utils';

describe('Verify that registerJahiaComponents behaves as expected', () => {
    before('Create test contents', () => {
        addSimplePage('/sites/npmTestSite/home', 'testRegisterJahiaComponents', 'Test registerJahiaComponents', 'en', 'simple', [
            {
                name: 'pagecontent',
                primaryNodeType: 'jnt:contentList'
            }
        ]).then(() => {
            addNode({
                parentPathOrId: '/sites/npmTestSite/home/testRegisterJahiaComponents/pagecontent',
                name: 'test',
                primaryNodeType: 'npmExample:testReactViewRegistration'
            });
        });
    });

    beforeEach('Login and visit', () => {
        cy.login();
        cy.visit('/jahia/jcontent/npmTestSite/en/pages/home/testRegisterJahiaComponents');
    });

    it('Check that components are properly registered', () => {
        cy.iframe('#page-builder-frame-1').within(() => {
            cy.get('div[data-testid="standardViewRegistration"]').should('exist');
            cy.get('div[data-testid="standardViewRegistration"]').contains('default');
            cy.get('div[data-testid="customViewRegistration"]').should('exist');
            cy.get('div[data-testid="customViewRegistration"]').contains('default');
            cy.get('div[data-testid="noRegistration"]').should('exist');
            cy.get('div[data-testid="noRegistration"]').contains('null');
        });
    });

    afterEach('Logout', () => cy.logout());
});
