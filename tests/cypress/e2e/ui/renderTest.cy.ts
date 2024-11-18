import {addNode, enableModule} from '@jahia/cypress';
import {addSimplePage} from '../../utils/Utils';

describe('Test on render and createContentButtons helpers', () => {
    const pageName = 'testRender';

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
                primaryNodeType: 'npmExample:testRender',
                properties: [{name: 'prop1', value: 'prop1 value'}]
            });
        });
    });

    it(`${pageName}: should display page composer create button correctly using createContentButtons helper`, function () {
        cy.login();
        cy.visit(`/jahia/jcontent/npmTestSite/en/pages/home/${pageName}`);
        cy.iframe('[data-sel-role="page-builder-frame-active"]', {timeout: 90000, log: true}).within(() => {
            cy.get('button[data-sel-role="jnt:text"]').should('exist');
        });
        cy.logout();
    });

    it(`${pageName}: should render jnt:text JSON node`, function () {
        cy.login();
        cy.visit(`/cms/render/default/en/sites/npmTestSite/home/${pageName}.html`);
        cy.get('div[data-testid="component-text-json-node"]').should('contain', 'JSON node rendered');
        cy.get('unwanteddiv').should('not.exist');
        cy.logout();
    });

    it(`${pageName}: should render jnt:text JSON node in config: OPTION`, function () {
        cy.login();
        cy.visit(`/cms/render/default/en/sites/npmTestSite/home/${pageName}.html`);
        cy.get('div[data-testid="component-text-json-node-option"]').should(
            'contain',
            'JSON node rendered with option config'
        );
        cy.get('unwanteddiv').should('not.exist');
        cy.logout();
    });

    it(`${pageName}: should render npmExample:test JSON node in config: OPTION with view: sub`, function () {
        cy.login();
        cy.visit(`/cms/render/default/en/sites/npmTestSite/home/${pageName}.html`);
        cy.get('div[data-testid="component-npm-json-node-option"]').should('contain', 'prop1 value it is');
        cy.get('unwanteddiv').should('not.exist');
        cy.logout();
    });

    it(`${pageName}: should render JSON node with INCLUDE config`, function () {
        cy.login();
        cy.visit(`/cms/render/default/en/sites/npmTestSite/home/${pageName}.html`);
        cy.get('div[data-testid="component-npm-node-include"]').should('contain', 'prop1 value');
        cy.get('unwanteddiv').should('not.exist');
        cy.logout();
    });

    it(`${pageName}: should render JSON node with mixin`, function () {
        cy.login();
        cy.visit(`/cms/render/default/en/sites/npmTestSite/home/${pageName}.html`);
        cy.get('div[data-testid="component-json-node-with-mixin"]').should('contain', 'tag1');
        cy.get('div[data-testid="component-json-node-with-mixin"]').should('contain', 'tag2');
        cy.get('unwanteddiv').should('not.exist');
        cy.logout();
    });

    it(`${pageName}: should render JSON node with parameters passed to render`, function () {
        cy.login();
        cy.visit(`/cms/render/default/en/sites/npmTestSite/home/${pageName}.html`);
        cy.get(
            'div[data-testid="component-json-node-with-parameters"] div[data-testid="renderParam-string1"]'
        ).should('contain', 'stringParam=stringValue');
        cy.get(
            'div[data-testid="component-json-node-with-parameters"] div[data-testid="renderParam-string2"]'
        ).should('contain', 'stringParam2=stringValue2');
        cy.get(
            'div[data-testid="component-json-node-with-parameters"] div[data-testid="renderParam-notString-notSupported"]'
        ).should('contain', 'objectParam not supported=');
        cy.get('unwanteddiv').should('not.exist');
        cy.logout();
    });

    it(`${pageName}: should render NPM node with parameters passed to render`, function () {
        cy.login();
        cy.visit(`/cms/render/default/en/sites/npmTestSite/home/${pageName}.html`);
        cy.get(
            'div[data-testid="component-npm-node-with-parameters"] div[data-testid="renderParam-string1"]'
        ).should('contain', 'stringParam=stringValue');
        cy.get(
            'div[data-testid="component-npm-node-with-parameters"] div[data-testid="renderParam-string2"]'
        ).should('contain', 'stringParam2=stringValue2');
        cy.get(
            'div[data-testid="component-npm-node-with-parameters"] div[data-testid="renderParam-notString-notSupported"]'
        ).should('contain', 'objectParam not supported=');
        cy.get('unwanteddiv').should('not.exist');
        cy.logout();
    });

    it(`${pageName}: should render existing child node using relative path`, function () {
        cy.login();
        addNode({
            parentPathOrId: `/sites/npmTestSite/home/${pageName}/pagecontent/test`,
            name: 'simpletext',
            primaryNodeType: 'jnt:text',
            properties: [{name: 'text', value: 'Child node rendered using relative path', language: 'en'}]
        });
        cy.visit(`/cms/render/default/en/sites/npmTestSite/home/${pageName}.html`);
        cy.get('div[data-testid="component-text-child-node"]').should(
            'contain',
            'Child node rendered using relative path'
        );
        cy.get('unwanteddiv').should('not.exist');
        cy.logout();
    });
});
