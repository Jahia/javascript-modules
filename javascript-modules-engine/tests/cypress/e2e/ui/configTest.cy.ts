import { addNode, publishAndWaitJobEnding } from '@jahia/cypress'
import { addSimplePage } from '../../utils/Utils'

describe('Test OSGi configuration in views', () => {
    const pageName = 'testConfig'

    before('Create test page', () => {
        addSimplePage('/sites/javascriptTestSite/home', pageName, pageName, 'en', 'simple', [
            {
                name: 'pagecontent',
                primaryNodeType: 'jnt:contentList',
            },
        ]).then(() => {
            addNode({
                parentPathOrId: `/sites/javascriptTestSite/home/${pageName}/pagecontent`,
                name: 'test',
                primaryNodeType: 'javascriptExample:testConfig',
            })
        })
        publishAndWaitJobEnding('/sites/javascriptTestSite')
    })

    const testConfigEntries = () => {
        cy.get('p[data-testid="configKey1"]').should('contain', 'configKey1=configValue1')
        cy.get('p[data-testid="configValues.configKey1"]').should('contain', 'configValues.configKey1=configValue1')
        cy.get('p[data-testid="configValues.configKey2"]').should('contain', 'configValues.configKey2=configValue2')
        cy.get('p[data-testid="defaultFactoryConfigs.configKey1"]').should(
            'contain',
            'defaultFactoryConfigs.configKey1=configValue1',
        )
        cy.get('p[data-testid="defaultFactoryConfigs.configKey2"]').should(
            'contain',
            'defaultFactoryConfigs.configKey2=configValue2',
        )
        cy.get('p[data-testid="testModuleFactoryIdentifiers"]').should(
            'contain',
            'testModuleFactoryIdentifiers=default,id1,id2',
        )
        cy.get('div[data-testid="complexObject_metadata.name"]').should('contain', 'metadata.name: my-app')
    }

    it(`${pageName}: test config in preview`, function () {
        cy.login()
        cy.visit(`/cms/render/default/en/sites/javascriptTestSite/home/${pageName}.html`)
        testConfigEntries()
        cy.logout()
    })

    it(`${pageName}: test config in edit`, function () {
        cy.login()
        cy.visit(`/jahia/jcontent/javascriptTestSite/en/pages/home/${pageName}`)
        cy.iframe('[data-sel-role="page-builder-frame-active"]', { timeout: 90000, log: true }).within(() => {
            testConfigEntries()
        })
        cy.logout()
    })

    it(`${pageName}: test config in live guest`, function () {
        cy.visit(`/sites/javascriptTestSite/home/${pageName}.html`)
        testConfigEntries()
    })

    it(`${pageName}: test config in live logged`, function () {
        cy.login()
        cy.visit(`/sites/javascriptTestSite/home/${pageName}.html`)
        testConfigEntries()
        cy.logout()
    })

    it(`${pageName}: test config in ajax rendered content`, function () {
        cy.visit(`/sites/javascriptTestSite/home/${pageName}/pagecontent/test.html.ajax`)
        testConfigEntries()
    })
})
