import { addNode, createUser, deleteUser } from '@jahia/cypress'
import { addSimplePage } from '../../utils/Utils'

describe('Test virtual nodes', () => {
    const pageName = 'testVirtualNode'

    before('Create test page and contents', () => {
        addSimplePage('/sites/npmTestSite/home', pageName, pageName, 'en', 'simple', [
            {
                name: 'pagecontent',
                primaryNodeType: 'jnt:contentList',
            },
        ]).then(() => {
            addNode({
                parentPathOrId: `/sites/npmTestSite/home/${pageName}/pagecontent`,
                name: 'test',
                primaryNodeType: 'npmExample:testVirtualNode',
                properties: [{ name: 'jcr:title', value: 'Test Virtual Node' }],
            })
        })
    })

    it(`${pageName}: Check virtual nodes are correctly rendered in preview mode`, function () {
        cy.login()
        cy.visit(`/cms/render/default/en/sites/npmTestSite/home/${pageName}.html`)
        cy.get('div[data-testid="testVirtualNodeSample_myProperty"]').contains('this is a virtual node property')
        cy.get('div[data-testid="virtualNode_aliasedUser"]').should('be.empty') // logged as root, no alias
        cy.logout()
    })
    it(`${pageName}: Check virtual nodes are correctly rendered in customized preview mode`, function () {
        cy.login()
        const users = ['fooUser', 'barUser']
        users.forEach((user) => {
            createUser(user, 'testPassword')
            cy.visit(`/cms/render/default/en/sites/npmTestSite/home/${pageName}.html?alias=${user}`)
            cy.get('div[data-testid="testVirtualNodeSample_myProperty"]').should(
                'have.text',
                'this is a virtual node property',
            )
            cy.get('div[data-testid="virtualNode_aliasedUser"]').should('have.text', user)
            deleteUser('testUser')
        })
        cy.logout()
    })
})
