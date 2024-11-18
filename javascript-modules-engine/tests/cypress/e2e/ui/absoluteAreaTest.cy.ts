import {addNode, enableModule} from '@jahia/cypress';
import 'cypress-wait-until';
import {addSimplePage} from '../../utils/Utils';

describe('Absolute Area test', () => {
    const pageName = 'testAbsoluteArea';

    before('Create test page and contents', () => {
        enableModule('event', 'npmTestSite');

        // First let's create the content on the home page that will be referenced by areas in the test pages.
        addNode({
            parentPathOrId: '/sites/npmTestSite/home',
            name: 'pagecontent',
            primaryNodeType: 'jnt:contentList'
        });

        addNode({
            parentPathOrId: '/sites/npmTestSite/home/pagecontent',
            name: 'twoColumns',
            primaryNodeType: 'npmExample:testAreaColumns'
        });

        addNode({
            parentPathOrId: '/sites/npmTestSite/home/pagecontent/twoColumns',
            name: 'twoColumns-col-1',
            primaryNodeType: 'jnt:contentList'
        });

        addNode({
            parentPathOrId: '/sites/npmTestSite/home/pagecontent/twoColumns/twoColumns-col-1',
            name: 'bigText',
            primaryNodeType: 'jnt:bigText',
            properties: [{name: 'text', value: 'Column 1', language: 'en'}]
        });

        addNode({
            parentPathOrId: '/sites/npmTestSite/home/pagecontent/twoColumns',
            name: 'twoColumns-col-2',
            primaryNodeType: 'jnt:contentList'
        });

        addNode({
            parentPathOrId: '/sites/npmTestSite/home/pagecontent/twoColumns/twoColumns-col-2',
            name: 'bigText',
            primaryNodeType: 'jnt:bigText',
            properties: [{name: 'text', value: 'Column 2', language: 'en'}]
        });

        addSimplePage('/sites/npmTestSite/home', pageName, pageName, 'en', 'simple', [
            {
                name: 'pagecontent',
                primaryNodeType: 'jnt:contentList'
            }
        ]).then(() => {
            addNode({
                parentPathOrId: `/sites/npmTestSite/home/${pageName}/pagecontent`,
                name: 'test',
                primaryNodeType: 'npmExample:testAbsoluteAreas'
            });
        });
    });

    it(`${pageName}: Basic Area test`, () => {
        cy.login();
        cy.visit(`/jahia/jcontent/npmTestSite/en/pages/home/${pageName}`);
        cy.iframe('#page-builder-frame-1').within(() => {
            cy.get('div[data-testid="basicArea"]').find('div[type="absoluteArea"]').should('be.visible');
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
            cy.get('div[data-testid="pathArea"]').find('div[type="absoluteArea"]').should('exist');
        });
        cy.logout();
    });

    it(`${pageName}: absolute Area`, () => {
        cy.login();
        cy.visit(`/jahia/jcontent/npmTestSite/en/pages/home/${pageName}`);
        cy.iframe('#page-builder-frame-1').within(() => {
            cy.get('div[data-testid="absoluteArea"]').find('div[data-testid="row-twoColumns"]').should('exist');
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

    it(`${pageName}: absolute Area level`, () => {
        cy.login();
        cy.visit(`/jahia/jcontent/npmTestSite/en/pages/home/${pageName}`);
        cy.iframe('#page-builder-frame-1').within(() => {
            cy.get('div[data-testid="absoluteAreaLevel"]').find('div[data-testid="row-twoColumns"]').should('exist');
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

    it(`${pageName}: Limited absolute area editing`, () => {
        cy.login();
        cy.visit(`/jahia/jcontent/npmTestSite/en/pages/home/${pageName}`);
        cy.iframe('#page-builder-frame-1').within(() => {
            cy.get('div[data-testid="limitedAbsoluteAreaEdit"]').find('div[type="existingNode"]').should('exist');
        });
        cy.logout();
    });

    it(`${pageName}: should render absolute area with parameters`, function () {
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
