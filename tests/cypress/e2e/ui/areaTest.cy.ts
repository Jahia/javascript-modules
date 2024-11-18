import {addNode, enableModule} from '@jahia/cypress';
import 'cypress-wait-until';
import {addSimplePage} from '../../utils/Utils';

describe('Area test', () => {
    const pageName = 'testJArea';

    before('Create test page and contents', () => {
        enableModule('event', 'npmTestSite');

        addSimplePage('/sites/npmTestSite/home', pageName, pageName, 'en', 'simple', [
            {
                name: 'pagecontent',
                primaryNodeType: 'jnt:contentList'
            }
        ]).then(() => {
            addNode({
                parentPathOrId: `/sites/npmTestSite/home/${pageName}/pagecontent`,
                name: 'test',
                primaryNodeType: 'npmExample:testAreas'
            });
        });
    });

    it(`${pageName}: Basic Area test`, () => {
        cy.login();
        cy.visit(`/jahia/jcontent/npmTestSite/en/pages/home/${pageName}`);
        cy.iframe('#page-builder-frame-1').within(() => {
            cy.get('div[data-testid="basicArea"]').find('div[type="area"]').should('be.visible');
        });
        cy.logout();
    });

    it(`${pageName}: Allowed types area`, () => {
        cy.login();
        cy.visit(`/jahia/jcontent/npmTestSite/en/pages/home/${pageName}`);
        cy.iframe('#page-builder-frame-1').within(() => {
            cy.get('div[data-testid="allowedTypesArea"]')
                .find('div[type="placeholder"]')
                .then(buttons => {
                    const selector = `div[data-jahia-id="${buttons.attr('id')}"]`;
                    cy.get(selector).find('button[data-sel-role="jnt:bigText"]').should('be.visible');
                    cy.get(selector).find('button[data-sel-role="jnt:event"]').should('be.visible');
                    cy.get(selector)
                        .find('button[data-sel-role!="jnt:event"][data-sel-role!="jnt:bigText"]')
                        .should('not.exist');
                });
        });
        cy.logout();
    });

    it(`${pageName}: Number of items area`, () => {
        cy.login();
        cy.visit(`/jahia/jcontent/npmTestSite/en/pages/home/${pageName}`);
        addNode({
            parentPathOrId: `/sites/npmTestSite/home/${pageName}/numberOfItemsArea`,
            name: 'item1',
            primaryNodeType: 'jnt:bigText'
        });
        addNode({
            parentPathOrId: `/sites/npmTestSite/home/${pageName}/numberOfItemsArea`,
            name: 'item2',
            primaryNodeType: 'jnt:bigText'
        });
        cy.reload();
        cy.iframe('#page-builder-frame-1').within(() => {
            cy.get('div[data-testid="numberOfItemsArea"]').find('div[type="placeholder"]').should('not.be.visible');
        });
        cy.logout();
    });

    it(`${pageName}: areaView Area`, () => {
        cy.login();
        cy.visit(`/jahia/jcontent/npmTestSite/en/pages/home/${pageName}`);
        cy.iframe('#page-builder-frame-1').within(() => {
            cy.get('div[data-testid="areaViewArea"]').find('ul[class*="dropdown"]').should('be.visible');
        });
        cy.logout();
    });

    it(`${pageName}: subNodesView Area`, () => {
        cy.login();
        cy.visit(`/jahia/jcontent/npmTestSite/en/pages/home/${pageName}`);
        addNode({
            parentPathOrId: `/sites/npmTestSite/home/${pageName}/subNodesViewArea`,
            name: 'item1',
            primaryNodeType: 'jnt:bigText'
        });
        cy.reload();
        cy.iframe('#page-builder-frame-1').within(() => {
            cy.get('div[data-testid="subNodesViewArea"]').find('a').contains('item1');
        });
        cy.logout();
    });

    it(`${pageName}: path Area`, () => {
        cy.login();
        cy.visit(`/jahia/jcontent/npmTestSite/en/pages/home/${pageName}`);
        cy.iframe('#page-builder-frame-1').within(() => {
            cy.get('div[data-testid="pathArea"]').find('div[type="area"]').should('exist');
        });
        cy.logout();
    });

    it(`${pageName}: non editable Area`, () => {
        cy.login();
        cy.visit(`/jahia/jcontent/npmTestSite/en/pages/home/${pageName}`);
        cy.iframe('#page-builder-frame-1').within(() => {
            cy.get('div[data-testid="nonEditableArea"]').should('be.empty');
        });
        cy.logout();
    });

    it(`${pageName}: Area as sub node`, () => {
        cy.login();
        cy.visit(`/jahia/jcontent/npmTestSite/en/pages/home/${pageName}`);
        cy.iframe('#page-builder-frame-1').within(() => {
            cy.get('div[data-testid="areaAsSubNode"]')
                .find('div[type="area"]').should('have.attr', 'path')
                .and('match', /\/pagecontent\/test\/areaAsSubNode$/);
        });
        cy.logout();
    });

    it(`${pageName}: Area type`, () => {
        cy.login();
        cy.visit(`/jahia/jcontent/npmTestSite/en/pages/home/${pageName}`);
        cy.iframe('#page-builder-frame-1').within(() => {
            cy.get('div[data-testid="areaType"]').find('div[data-testid="row-areaType"]').should('exist');
        });
        cy.logout();
    });

    it(`${pageName}: should render area with parameters`, function () {
        cy.login();
        cy.visit(`/jahia/jcontent/npmTestSite/en/pages/home/${pageName}`);
        cy.iframe('#page-builder-frame-1').within(() => {
            cy.get(
                'div[data-testid="areaParam-string1"]'
            ).should('contain', 'stringParam1=stringValue1');
            cy.get(
                'div[data-testid="areaParam-string2"]'
            ).should('contain', 'stringParam2=stringValue2');
        });
        cy.logout();
    });
});
