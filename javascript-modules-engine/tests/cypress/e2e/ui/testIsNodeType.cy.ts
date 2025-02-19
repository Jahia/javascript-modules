import { addNode } from '@jahia/cypress'
import { addSimplePage } from '../../utils/Utils'
describe('test isNodeType', () => {
    before('Create test contents', () => {
        addSimplePage('/sites/javascriptTestSite/home', 'testIsNodeType', 'Test isNodeType', 'en', 'simple', [
            {
                name: 'pagecontent',
                primaryNodeType: 'jnt:contentList',
            },
        ]).then(() => {
            addNode({
                parentPathOrId: '/sites/javascriptTestSite/home/testIsNodeType/pagecontent',
                name: 'test',
                primaryNodeType: 'javascriptExample:testIsNodeType',
            })
        })
    })

    it('should display the node type', () => {
        cy.login()
        cy.visit('/cms/render/default/en/sites/javascriptTestSite/home/testIsNodeType.html')
        cy.get('div[data-testid="currentNode_isNodeType"]').should('exist').contains('true')
        cy.get('div[data-testid="currentNode_isNotNodeType"]').should('exist').contains('false')
        cy.logout()
    })
})
