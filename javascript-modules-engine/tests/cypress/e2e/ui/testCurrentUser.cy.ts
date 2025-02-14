import { addNode } from '@jahia/cypress'
import { addSimplePage } from '../../utils/Utils'

describe('Test current user', () => {
    before('Create tests contents', () => {
        addSimplePage('/sites/javascriptTestSite/home', 'testCurrentUser', 'Test current user', 'en', 'simple', [
            {
                name: 'pagecontent',
                primaryNodeType: 'jnt:contentList',
            },
        ]).then(() => {
            addNode({
                parentPathOrId: '/sites/javascriptTestSite/home/testCurrentUser/pagecontent',
                name: 'test',
                primaryNodeType: 'javascriptExample:testCurrentUser',
            })
        })
    })

    it('should display the current user as root', () => {
        cy.login()
        cy.visit('/cms/render/default/en/sites/javascriptTestSite/home/testCurrentUser.html')
        cy.get('div[data-testid="currentUser_name"]').should('exist').contains('root')
        cy.get('div[data-testid="currentUser_isRoot"]').should('exist').contains('true')
        cy.logout()
    })
})
