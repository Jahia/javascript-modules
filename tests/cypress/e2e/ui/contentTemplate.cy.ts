import {addNode, enableModule} from '@jahia/cypress';
import {addEventPageAndEvents, addSimplePage} from '../../utils/Utils';

describe('Content templates resolution testsuite', () => {
    const siteKey = 'npmTestSite';

    before('Create test page and contents', () => {
        enableModule('calendar', siteKey);
        enableModule('event', siteKey);

        addEventPageAndEvents(siteKey, 'events', 'testEvents', () => {
            addSimplePage('/sites/npmTestSite/home', 'testFindDisplayableNode', 'Simple page', 'en', 'simple', [
                {
                    name: 'pagecontent',
                    primaryNodeType: 'jnt:contentList'
                }
            ]).then(() => {
                addNode({
                    parentPathOrId: '/sites/npmTestSite/home/testFindDisplayableNode/pagecontent',
                    name: 'findDisplayableContent',
                    primaryNodeType: 'npmExample:testFindDisplayableContent',
                    properties: [
                        {name: 'target', value: '/sites/npmTestSite/home/testEvents/events/event-a', type: 'WEAKREFERENCE'}
                    ]
                });
            });
        });

        addSimplePage('/sites/npmTestSite/home', 'testContentTemplate', 'testContentTemplate', 'en', 'simple', [
            {
                name: 'pagecontent',
                primaryNodeType: 'jnt:contentList'
            }
        ]).then(() => {
            addNode({
                parentPathOrId: '/sites/npmTestSite/home/testContentTemplate/pagecontent',
                name: 'content',
                primaryNodeType: 'npmExample:testContentTemplate'
            });
        });

        addSimplePage('/sites/npmTestSite/home', 'testContentTemplateWithView', 'testContentTemplateWithView', 'en', 'simple', [
            {
                name: 'pagecontent',
                primaryNodeType: 'jnt:contentList'
            }
        ]).then(() => {
            addNode({
                parentPathOrId: '/sites/npmTestSite/home/testContentTemplateWithView/pagecontent',
                name: 'content',
                primaryNodeType: 'npmExample:testContentTemplate',
                mixins: ['jmix:renderable'],
                properties: [
                    {name: 'j:view', value: 'other'}
                ]
            });
        });
    });

    it('Verify content template for jnt:event is correctly displayed', function () {
        cy.login();
        cy.visit(`/jahia/page-composer/default/en/sites/${siteKey}/home/testEvents/events/event-a.full.html`);
        cy.visit(`/cms/render/default/en/sites/${siteKey}/home/testEvents/events/event-a.full.html`);

        // Check template is good:
        cy.get('div[class="header"]').should('be.visible');
        cy.get('div[class="nav"]').should('be.visible');
        cy.get('div[class="main"]').should('be.visible');
        cy.get('div[class="footer"]').should('be.visible');

        // Check main resource display is correct:
        cy.get('div[class="eventsBody"]').should('be.visible');
        cy.get('div[class="eventsBody"]').contains('The first event');
        cy.logout();
    });

    it('Verify findDisplayableNode is correctly resolving jnt:event that is using a JS content template', function () {
        cy.login();
        cy.visit(`/jahia/page-composer/default/en/sites/${siteKey}/home/testFindDisplayableNode.html`);
        cy.visit(`/cms/render/default/en/sites/${siteKey}/home/testFindDisplayableNode.html`);

        cy.get('p[data-testid="displayableContent"]').contains('Found displayable content: /sites/npmTestSite/home/testEvents/events/event-a');
        cy.logout();
    });

    it('Test default content template is working properly when content doesn\'t have specific view', function () {
        cy.login();
        cy.visit(`/cms/render/default/en/sites/${siteKey}/home/testContentTemplate/pagecontent/content.html`);
        // Check template is correctly resolved:
        cy.get('.header').should('exist');
        // Check content is correctly displayed:
        cy.contains('Just a normal view').should('be.visible');
        cy.logout();
    });

    it('Test default content template is working properly when content have specific view', function () {
        cy.login();
        cy.visit(`/cms/render/default/en/sites/${siteKey}/home/testContentTemplateWithView/pagecontent/content.html`);
        // Check template is correctly resolved:
        cy.get('.header').should('exist');
        // Check content is correctly displayed:
        cy.contains('Just an other normal view').should('be.visible');
        cy.logout();
    });
});
