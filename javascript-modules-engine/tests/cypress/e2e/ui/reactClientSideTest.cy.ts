import {addNode, publishAndWaitJobEnding} from '@jahia/cypress';
import {addSimplePage} from '../../utils/Utils';

describe('Verify client side component are rehydrated as expected', () => {
    before('Create test contents', () => {
        addSimplePage('/sites/npmTestSite/home', 'testHydrateInBrowser', 'Test HydrateInBrowser', 'en', 'simple', [
            {
                name: 'pagecontent',
                primaryNodeType: 'jnt:contentList'
            }
        ]).then(() => {
            addNode({
                parentPathOrId: '/sites/npmTestSite/home/testHydrateInBrowser/pagecontent',
                name: 'test',
                primaryNodeType: 'npmExample:testReactClientSide'
            });
        });
        publishAndWaitJobEnding('/sites/npmTestSite/home/testHydrateInBrowser');
    });

    beforeEach('Login and visit', () => cy.login());

    ['default', 'live'].forEach(workspace => {
        it(`${workspace}: Check that components is hydrated correctly`, () => {
            cy.visit(`/cms/render/${workspace}/en/sites/npmTestSite/home/testHydrateInBrowser.html`);
            cy.get('p[data-testid="count"]').should('exist');
            cy.get('p[data-testid="count"]').should('contain', 'Count: 9');
            cy.get('button[data-testid="count-button"]').click();
            cy.get('button[data-testid="count-button"]').click();
            cy.get('p[data-testid="count"]').should('contain', 'Count: 11');

            cy.get('span[data-testid="path"]').should('exist');
            cy.get('span[data-testid="path"]').should('contain', '/sites/npmTestSite/home/testHydrateInBrowser/pagecontent/test');
            cy.get('span[data-testid="counter"]').should('exist');
            cy.get('span[data-testid="counter"]').should('not.contain', '0');
            cy.get('span[data-testid="counter"]').should('contain', '0');
        });
    });

    afterEach('Logout', () => cy.logout());
});
