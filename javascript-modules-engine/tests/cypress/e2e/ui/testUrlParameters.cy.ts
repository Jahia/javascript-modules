import { addSimplePage } from '../../utils/Utils'
import { addNode } from '@jahia/cypress'

describe('Test url parameters', () => {
    before('Create tests contents', () => {
        addSimplePage('/sites/javascriptTestSite/home', 'testUrlParameters', 'Test url parameters', 'en', 'simple', [
            {
                name: 'pagecontent',
                primaryNodeType: 'jnt:contentList',
            },
        ]).then(() => {
            addNode({
                parentPathOrId: '/sites/javascriptTestSite/home/testUrlParameters/pagecontent',
                name: 'test',
                primaryNodeType: 'javascriptExample:testUrlParameters',
            })
        })
    })

    it('should display the url parameters', () => {
        cy.login()
        cy.visit('/cms/render/default/en/sites/javascriptTestSite/home/testUrlParameters.html?test=root')
        cy.get('div[data-testid="renderContext_urlParameters"]').should('exist').contains('root')
        cy.logout()
    })

    it('should display the url parameters with special chars', () => {
        cy.login()
        const param = '(root,user,:./" \\)'
        cy.visit('/cms/render/default/en/sites/javascriptTestSite/home/testUrlParameters.html?test=' + param)
        cy.get('div[data-testid="renderContext_urlParameters"]').should('exist').contains(param)
        cy.logout()
    })
})
