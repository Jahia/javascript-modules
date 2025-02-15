import { addSimplePage } from '../../utils/Utils'
import { addNode } from '@jahia/cypress'

describe('Test has permission', () => {
    before('Create test contents', () => {
        addSimplePage('/sites/javascriptTestSite/home', 'testHasPermission', 'Test has permission', 'en', 'simple', [
            {
                name: 'pagecontent',
                primaryNodeType: 'jnt:contentList',
            },
        ]).then(() => {
            addNode({
                parentPathOrId: '/sites/javascriptTestSite/home/testHasPermission/pagecontent',
                name: 'test',
                primaryNodeType: 'javascriptExample:testHasPermission',
            })
        })
    })

    it('should display the permission', () => {
        cy.login()
        cy.visit('/cms/render/default/en/sites/javascriptTestSite/home/testHasPermission.html')
        cy.get('div[data-testid="currentNode_hasPermission"]').should('exist').contains('true')
        cy.get('div[data-testid="currentNode_hasNotPermission"]').should('exist').contains('false')
        cy.logout()
    })
})
