import {publishAndWaitJobEnding} from '@jahia/cypress';
import 'cypress-iframe';
import {addSimplePage} from '../../utils/Utils';

const checkSectionsPresence = () => {
    cy.get('div[class="header"]').should('be.visible');
    cy.get('div[class="nav"]').should('be.visible');
    cy.get('div[class="main"]').should('be.visible');
    cy.get('div[class="footer"]').should('be.visible');
};

describe('Template testsuite', () => {
    const pageName = 'testTemplate';

    before('Create test page and contents', () => {
        addSimplePage('/sites/npmTestSite/home', pageName, pageName, 'en', 'simple', [
            {
                name: 'pagecontent',
                primaryNodeType: 'jnt:contentList'
            }
        ]);
    });

    it(`${pageName}: Verify 4 sections presence`, () => {
        cy.login();
        cy.visit(`/jahia/jcontent/npmTestSite/en/pages/home/${pageName}`);
        cy.iframe('#page-builder-frame-1').within(() => {
            checkSectionsPresence();
        });
        cy.logout();
    });

    it(`${pageName}: Check grouping components`, () => {
        cy.login();
        cy.visit(`/jahia/jcontent/npmTestSite/en/pages/home/${pageName}`);
        cy.iframe('#page-builder-frame-1').within(() => {
            cy.get('button[data-sel-role="createContent"]:first').click();
        });
        cy.get('li[role="treeitem"]:contains("npmExampleComponent")').click();
        cy.get('li[role="treeitem"]:contains("Navigation Menu")').should('be.visible');
        cy.get('li[role="treeitem"]:contains("test")').should('be.visible');
        cy.logout();
    });

    it(`${pageName}: Check 4 sections presence in LIVE workspace`, () => {
        cy.login();
        cy.visit(`/jahia/jcontent/npmTestSite/en/pages/home/${pageName}`);
        publishAndWaitJobEnding('/sites/npmTestSite');
        cy.visit(`/sites/npmTestSite/home/${pageName}.html`);
        checkSectionsPresence();
        cy.logout();
    });
});
