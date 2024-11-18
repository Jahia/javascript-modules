// ***********************************************************
// This example support/index.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';
import {addNode, createSite, deleteSite} from '@jahia/cypress';
import {addSimplePage} from '../utils/Utils';

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('cypress-terminal-report/src/installLogsCollector')({
    xhr: {
        printHeaderData: true,
        printRequestData: true
    },
    enableExtendedCollector: true,
    collectTypes: ['cons:log', 'cons:info', 'cons:warn', 'cons:error', 'cy:log', 'cy:xhr', 'cy:request', 'cy:intercept', 'cy:command']
});
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('@jahia/cypress/dist/support/registerSupport').registerSupport();
Cypress.on('uncaught:exception', (err, runnable) => {
    // Returning false here prevents Cypress from
    // failing the test
    return false;
});

before('Create NPM test site', () => {
    createSite('npmTestSite', {
        languages: 'en',
        templateSet: 'jahia-npm-module-example',
        locale: 'en',
        serverName: 'localhost'
    });

    addSimplePage('/sites/npmTestSite/home', 'testPage', 'testPage', 'en', 'simple', [
        {
            name: 'pagecontent',
            primaryNodeType: 'jnt:contentList'
        }
    ]).then(() => {
        addNode({
            parentPathOrId: '/sites/npmTestSite/home/testPage/pagecontent',
            name: 'test',
            primaryNodeType: 'npmExample:test',
            properties: [
                {name: 'jcr:title', value: 'NPM test component'},
                {name: 'prop1', value: 'prop1 value'},
                {name: 'propMultiple', values: ['value 1', 'value 2', 'value 3']},
                {name: 'propRichText', value: '<p data-testid="propRichTextValue">Hello this is a sample rich text</p>'}
            ]
        });
    });
});

after('Clean', () => {
    cy.visit('/start', {failOnStatusCode: false});
    deleteSite('npmTestSite');
    cy.logout();
});
