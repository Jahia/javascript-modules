import {addSimplePage} from '../../utils/Utils';
import {addNode} from '@jahia/cypress';

describe('Test has permission', () => {
    before('Create test contents', () => {
        addSimplePage('/sites/npmTestSite/home', 'testHasPermission', 'Test has permission', 'en', 'simple', [
            {
                name: 'pagecontent',
                primaryNodeType: 'jnt:contentList'
            }
        ]).then(() => {
            addNode({
                parentPathOrId: '/sites/npmTestSite/home/testHasPermission/pagecontent',
                name: 'test',
                primaryNodeType: 'npmExample:testHasPermission'
            });
        });
    });

    it('should display the permission', () => {
        cy.login();
        cy.visit('/cms/render/default/en/sites/npmTestSite/home/testHasPermission.html');
        cy.get('div[data-testid="currentNode_hasPermission"]')
            .should('exist')
            .contains('true');
        cy.get('div[data-testid="currentNode_hasNotPermission"]')
            .should('exist')
            .contains('false');
        cy.logout();
    });
});
