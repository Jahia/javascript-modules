import { addNode, deleteNode, publishAndWaitJobEnding } from '@jahia/cypress'
import { addSimplePage } from '../../utils/Utils'

describe('Verify that the legacy/deprecated registration behaves as expected', () => {
    beforeEach('Create test data', () => {
        addSimplePage(
            '/sites/javascriptTestSite/home',
            'testRegisterLegacyJahiaComponents',
            'Test registerLegacyJahiaComponents',
            'en',
            'simple',
            [
                {
                    name: 'pagecontent',
                    primaryNodeType: 'jnt:contentList',
                },
            ],
        ).then(() => {
            publishAndWaitJobEnding(`/sites/javascriptTestSite/home/testRegisterLegacyJahiaComponents`)
        })
    })

    afterEach('Cleanup data', () => {
        deleteNode('/sites/javascriptTestSite/home/testRegisterLegacyJahiaComponents')
        publishAndWaitJobEnding('/sites/javascriptTestSite/home')
    })

    it('Test minimum legacy registration of Jahia components', () => {
        addNode({
            parentPathOrId: '/sites/javascriptTestSite/home/testRegisterLegacyJahiaComponents/pagecontent',
            name: 'test-legacy-registration-minimal',
            primaryNodeType: 'javascriptExample:testLegacyRegistrationMinimal',
        }).then(() => {
            publishAndWaitJobEnding('/sites/javascriptTestSite/home/testRegisterLegacyJahiaComponents')
            cy.visit(`/sites/javascriptTestSite/home/testRegisterLegacyJahiaComponents.html`)
            cy.get('div[data-testid="legacyRegistrationMinimal"]').contains(
                'javascriptExample:testLegacyRegistrationMinimal view component',
            )
        })
    })

    it('Test advanced legacy registration of Jahia components', () => {
        addNode({
            parentPathOrId: '/sites/javascriptTestSite/home/testRegisterLegacyJahiaComponents/pagecontent',
            name: 'testLegacyRegistrationAdvanced',
            primaryNodeType: 'javascriptExample:testLegacyRegistrationAdvanced',
            mixins: ['jmix:renderable'],
            properties: [{ name: 'j:view', value: 'legacyRegistrationAdvancedName' }],
        }).then(() => {
            publishAndWaitJobEnding('/sites/javascriptTestSite/home/testRegisterLegacyJahiaComponents')
            cy.visit(`/sites/javascriptTestSite/home/testRegisterLegacyJahiaComponents.html`)
            cy.get('div[data-testid="legacyRegistrationAdvanced"]').should('exist')
            cy.get('div[data-testid="legacyRegistrationAdvanced"] span[data-testid="registryName"]').contains(
                'legacyRegistrationAdvancedName',
            )
            cy.get('div[data-testid="legacyRegistrationAdvanced"] span[data-testid="myProp"]').contains('my value')
        })
    })
})
